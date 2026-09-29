#!/usr/bin/env python3

import json
import logging
import math
import os
import re
import textwrap

from PIL import Image
from unityparser import UnityDocument

import blacklist
import util
from util import get_translations


def load_sprite_mapping():
    sprite_dir = 'dump/CoreKeeper/ExportedProject/Assets/Sprite'
    texture_dir = 'dump/CoreKeeper/ExportedProject/Assets/Texture2D'

    texture_guid_to_path = {}
    for f in os.listdir(texture_dir):
        if f.endswith('.png.meta'):
            png_path = os.path.join(texture_dir, f[:-5])
            with open(os.path.join(texture_dir, f), 'r', encoding='utf-8', errors='ignore') as fp:
                for l in fp:
                    if l.startswith('guid: '):
                        texture_guid_to_path[l.strip().split(' ')[1]] = png_path
                        break

    sprite_guid_to_info = {}
    for f in os.listdir(sprite_dir):
        if f.endswith('.asset.meta'):
            meta_path = os.path.join(sprite_dir, f)
            asset_path = os.path.join(sprite_dir, f[:-5])
            with open(meta_path, 'r', encoding='utf-8', errors='ignore') as fp:
                s_guid = None
                for l in fp:
                    if l.startswith('guid: '):
                        s_guid = l.strip().split(' ')[1]
                        break
            if s_guid and os.path.exists(asset_path):
                with open(asset_path, 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()
                    m_rect = re.search(r'm_Rect:\s+serializedVersion:\s+\d+\s+x:\s+([-\d.]+)\s+y:\s+([-\d.]+)\s+width:\s+([-\d.]+)\s+height:\s+([-\d.]+)', content)
                    t_guid = re.search(r'texture:\s+\{[^}]*guid:\s+([a-f0-9]+)', content)
                    if m_rect and t_guid:
                        x = float(m_rect.group(1))
                        y = float(m_rect.group(2))
                        w = float(m_rect.group(3))
                        h = float(m_rect.group(4))
                        tex_path = texture_guid_to_path.get(t_guid.group(1))
                        sprite_guid_to_info[s_guid] = {
                            'x': x, 'y': y, 'width': w, 'height': h,
                            'texture_path': tex_path
                        }

    return sprite_guid_to_info


def get_objectinfo_monobehaviour() -> list:
    logger = logging.getLogger('get_objectinfo_monobehaviour')
    prefabs_dir = 'dump/CoreKeeper/ExportedProject/Assets/GameObject'
    
    objectinfo_list = []
    seen_oids = set()

    for fname in os.listdir(prefabs_dir):
        if not fname.endswith('.prefab'):
            continue
        p = os.path.join(prefabs_dir, fname)
        with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
            c = fp.read()
        if 'objectInfo:' not in c:
            continue

        mb_docs = c.split('--- !u!114')
        item_info = None
        conditions = []
        damage = None
        is_range = False
        cooldown = None

        for mb in mb_docs[1:]:
            clean_mb = re.sub(r' &\d+\nMonoBehaviour:', '', mb)
            if 'objectInfo:' in clean_mb:
                try:
                    import yaml
                    y = yaml.safe_load(clean_mb)
                    if y and 'objectInfo' in y and y['objectInfo']:
                        item_info = y['objectInfo']
                except Exception:
                    pass
            if 'givesConditionsWhenEquipped:' in clean_mb:
                try:
                    import yaml
                    y = yaml.safe_load(clean_mb)
                    if y and 'givesConditionsWhenEquipped' in y and y['givesConditionsWhenEquipped']:
                        conditions.extend(y['givesConditionsWhenEquipped'])
                except Exception:
                    pass
            if 'damage:' in clean_mb and ('isRange:' in clean_mb or 'canDamageTiles:' in clean_mb):
                try:
                    import yaml
                    y = yaml.safe_load(clean_mb)
                    if y and 'damage' in y and y['damage'] is not None:
                        damage = int(y['damage'])
                        is_range = int(y.get('isRange', 0)) == 1
                except Exception:
                    pass
            if 'cooldown:' in clean_mb:
                try:
                    import yaml
                    y = yaml.safe_load(clean_mb)
                    if y and 'cooldown' in y and y['cooldown'] is not None:
                        cooldown = float(y['cooldown'])
                except Exception:
                    pass

        if not item_info or 'objectID' not in item_info:
            continue

        try:
            object_id = int(item_info['objectID'])
            object_type = int(item_info.get('objectType', 0))
        except (ValueError, TypeError):
            continue

        if object_id == 0 or object_type in (900, 6000) or object_id in blacklist.ITEM_BLACKLIST:
            continue

        icon = item_info.get('icon', {})
        if not icon or not icon.get('guid') or icon.get('guid') == '00000000000000000000000000000000':
            continue

        item_info['objectID'] = object_id
        item_info['objectType'] = object_type
        item_info['initialAmount'] = int(item_info.get('initialAmount', 1))
        item_info['rarity'] = int(item_info.get('rarity', 0))
        item_info['isStackable'] = int(item_info.get('isStackable', 0))

        if conditions:
            item_info['givesConditionsWhenEquipped'] = conditions
        if damage is not None:
            item_info['damage'] = damage
            item_info['isRange'] = is_range
        if cooldown is not None:
            item_info['cooldown'] = cooldown

        # Deduplicate prefabs for same objectID (prefer non-entity or entity consistently)
        if object_id in seen_oids:
            continue
        seen_oids.add(object_id)
        objectinfo_list.append(item_info)

    return objectinfo_list


def get_item_translations():
    translations = get_translations()
    item_and_desc_translations = {}
    for translation in translations:
        term = translation['term']
        text = translation['value']
        if term.startswith('Items/'):
            item_and_desc_translations[term[6:]] = text

    item_translations = {}
    for item in item_and_desc_translations:
        text = item_and_desc_translations[item]
        if item.endswith('Desc'):
            key = item[:len(item) - 4]
            is_description = True
        else:
            key = item
            is_description = False

        if item_translations.get(key) is None:
            item_translations[key] = {}

        if is_description:
            item_translations[key]['description'] = text
        else:
            item_translations[key]['text'] = text

    return item_translations


def get_object_ids() -> dict:
    enum = util.get_enum('dump/CoreKeeper/ExportedProject/Assets/MonoScript/Pug.Base/ObjectID.cs')
    enum[5502] = 'GiantMushroom'
    enum[5503] = 'AmberLarva'
    return enum


def get_set_bonuses():
    set_bonuses_doc = UnityDocument.load_yaml('dump/CoreKeeper/ExportedProject/Assets/Resources/SetBonusesTable.asset')
    mono_behaviour = set_bonuses_doc.data[0]
    mono_behaviour_set_bonuses = mono_behaviour.setBonuses
    set_bonuses = {}
    for set_bonus in mono_behaviour_set_bonuses:
        pieces = []
        object_id_hex = textwrap.wrap(str(set_bonus['availablePieces']), 8)
        for hex_string in object_id_hex:
            hex_list = textwrap.wrap(hex_string, 2)
            hex_list.reverse()
            object_id = int("0x%s" % ''.join(hex_list), 0)
            pieces.append(object_id)

        set_bonus_datas = set_bonus['setBonusDatas']
        for set_bonus_data in set_bonus_datas:
            set_bonus_data['conditionData'].pop('duration', None)

        set_bonus_id = int(set_bonus['setBonusID'])
        set_bonuses[set_bonus_id] = {
            'id': set_bonus_id,
            'rarity': int(set_bonus['rarity']),
            'data': set_bonus_datas,
            'pieces': pieces
        }

    return set_bonuses


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    print('Step 1: Loading sprite mappings...')
    sprite_map = load_sprite_mapping()
    print(f'Loaded {len(sprite_map)} sprites.')

    print('Step 2: Loading prefabs...')
    objectinfo_list = get_objectinfo_monobehaviour()
    print(f'Found {len(objectinfo_list)} item prefabs.')

    print('Step 3: Loading translations, object IDs, set bonuses...')
    item_translations = get_item_translations()
    object_ids = get_object_ids()
    set_bonuses = get_set_bonuses()

    set_bonus_ids = {}
    for set_bonus_id, set_bonus in set_bonuses.items():
        for piece in set_bonus['pieces']:
            set_bonus_ids[piece] = set_bonus_id

    item_data = {}
    images = []
    icon_index = 0
    opened_images = {}

    print('Step 4: Processing items and icons...')
    for objectinfo in objectinfo_list:
        object_id = objectinfo['objectID']
        object_name = object_ids.get(object_id)
        if not object_name:
            continue

        if object_name.startswith('Cooked') and (object_name.endswith('Rare') or object_name.endswith('Epic')):
            translation = item_translations.get(object_name[:-4])
        else:
            translation = item_translations.get(object_name)

        if translation is None:
            # Fallback to enum name spaced out if translation not found
            spaced_name = re.sub(r'([A-Z])', r' \1', object_name).strip()
            translation = {'text': spaced_name, 'description': ''}

        single_data = {
            'objectID': object_id,
            'objectName': object_name,
            'name': translation['text'],
            'description': translation.get('description', ''),
            'initialAmount': objectinfo['initialAmount'],
            'objectType': objectinfo['objectType'],
            'rarity': objectinfo['rarity'],
            'isStackable': objectinfo['isStackable'],
            'iconIndex': icon_index
        }

        conditions = objectinfo.get('givesConditionsWhenEquipped')
        if conditions:
            single_data['whenEquipped'] = []
            for condition in conditions:
                try:
                    single_data['whenEquipped'].append({
                        'id': int(condition['id']),
                        'value': int(condition.get('value', 0))
                    })
                except Exception:
                    pass

        damage = objectinfo.get('damage')
        if damage is not None:
            is_range = objectinfo.get('isRange', False)
            damage_tenth = damage * 0.1
            damage_min = int(damage - math.floor(damage_tenth))
            damage_max = int(damage + math.floor(damage_tenth))
            single_data['damage'] = {
                'range': [damage_min, damage_max],
                'isRange': bool(is_range)
            }

        cooldown = objectinfo.get('cooldown')
        if cooldown is not None and cooldown > 0:
            single_data['cooldown'] = round(1 / cooldown, 2)

        set_bonus_id = set_bonus_ids.get(object_id)
        if set_bonus_id is not None:
            single_data['setBonusId'] = set_bonus_id

        # Icon processing
        icon = objectinfo.get('icon', {})
        icon_guid = icon.get('guid')
        sprite_info = sprite_map.get(icon_guid)

        icon_offset = objectinfo.get('iconOffset') or {}
        icon_offset_x = float(icon_offset.get('x', 0)) if isinstance(icon_offset, dict) else 0.0
        icon_offset_y = float(icon_offset.get('y', 0)) if isinstance(icon_offset, dict) else 0.0

        cropped_image = None
        if sprite_info and sprite_info['texture_path'] and os.path.exists(sprite_info['texture_path']):
            tex_path = sprite_info['texture_path']
            if tex_path not in opened_images:
                opened_images[tex_path] = Image.open(tex_path)
            img = opened_images[tex_path]

            x = sprite_info['x']
            y = sprite_info['y']
            w = sprite_info['width']
            h = sprite_info['height']

            # Pixels per unit in Core Keeper is 16
            offset_x = icon_offset_x * 16
            offset_y = icon_offset_y * 16

            diff_x = (w - 16) / 2
            diff_y = (h - 16) / 2

            cropped_x = int(x + diff_x + offset_x)
            cropped_y = int(img.height - y - h + diff_y + offset_y)
            cropped_x2 = cropped_x + 16
            cropped_y2 = cropped_y + 16

            area = (cropped_x, cropped_y, cropped_x2, cropped_y2)
            cropped_image = img.crop(area)
            if cropped_image.size != (16, 16):
                res = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
                res.paste(cropped_image, (0, 0))
                cropped_image = res

        if cropped_image is None:
            # Fallback 16x16 transparent image
            cropped_image = Image.new('RGBA', (16, 16), (0, 0, 0, 0))

        item_data[object_id] = single_data
        images.append(cropped_image)
        icon_index += 1

    print(f'Step 5: Writing spritesheet for {icon_index} items...')
    os.makedirs('out/item', exist_ok=True)
    spritesheet = Image.new('RGBA', (icon_index * 16, 16))
    for idx, img in enumerate(images):
        spritesheet.paste(img, (idx * 16, 0))
    spritesheet.save('out/item/item-spritesheet.png')

    sorted_item_data = dict(sorted(item_data.items(), key=lambda x: x[0]))

    with open('out/item/item-data.json', 'w', encoding='utf-8') as f:
        json.dump({
            'items': sorted_item_data,
            'setBonuses': set_bonuses
        }, f, indent=2)

    print(f'Successfully exported {len(sorted_item_data)} items and {len(set_bonuses)} set bonuses!')
