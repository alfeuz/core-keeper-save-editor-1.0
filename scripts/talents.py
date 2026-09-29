#!/usr/bin/env python3

import json
import os
import re

from PIL import Image
from unityparser import UnityDocument

import util

divide_by_ten = [
    [0, 0, 0, 0, 1, 0, 0, 1],  # 0: Mining
    [0, 0, 1, 1, 0, 1, 1, 1],  # 1: Running
    [1, 0, 0, 0, 1, 0, 0, 0],  # 2: Melee
    [0, 1, 1, 1, 0, 0, 0, 0],  # 3: Vitality
    [0, 0, 0, 0, 0, 0, 0, 1],  # 4: Crafting
    [1, 0, 0, 1, 0, 0, 1, 0],  # 5: Ranged
    [0, 0, 0, 0, 0, 0, 0, 0],  # 6: Gardening
    [0, 0, 0, 0, 0, 0, 0, 0],  # 7: Fishing
    [0, 0, 0, 1, 0, 1, 0, 1],  # 8: Cooking
    [0, 1, 1, 0, 0, 0, 0, 0],  # 9: Magic
    [0, 1, 0, 1, 1, 0, 0, 0],  # 10: Summoning
    [0, 0, 0, 0, 0, 1, 1, 1]   # 11: Explosives
]


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


if __name__ == '__main__':
    translations = util.get_translations()
    skill_talent_name_to_translation = {}

    for translation in translations:
        term = translation['term']
        translation_value = translation['value']
        if term.startswith('SkillTalents/'):
            parts = term.split('/')
            if len(parts) == 2:
                skill_talent_name_to_translation[parts[1]] = translation_value

    sprite_map = load_sprite_mapping()

    os.makedirs('out/talents/image', exist_ok=True)
    talent_data = {}
    for i in range(12):
        talent_data[i] = []

    doc = UnityDocument.load_yaml('./dump/CoreKeeper/ExportedProject/Assets/Resources/SkillTalentsTable.asset')
    mono_behaviour = doc.get(class_name='MonoBehaviour')
    icon_index = 0

    # Image cache for textures
    opened_images = {}

    for skill_talent_tree in mono_behaviour.skillTalentTrees:
        skill_id = int(skill_talent_tree['skillID'])
        for talent in skill_talent_tree['skillTalents']:
            raw_name = talent['name']
            name = skill_talent_name_to_translation.get(raw_name, raw_name)
            increment = int(talent['conditionValuePerPoint'])
            condition_id = int(talent['givesCondition'])

            tenth = False
            if skill_id < len(divide_by_ten) and len(talent_data[skill_id]) < len(divide_by_ten[skill_id]):
                tenth = divide_by_ten[skill_id][len(talent_data[skill_id])] == 1

            talent_data[skill_id].append({
                'name': name,
                'increment': increment,
                'conditionId': condition_id,
                'tenth': tenth,
                'iconIndex': icon_index
            })

            # Crop icon
            icon_guid = talent['icon']['guid']
            sprite_info = sprite_map.get(icon_guid)

            if sprite_info and sprite_info['texture_path'] and os.path.exists(sprite_info['texture_path']):
                tex_path = sprite_info['texture_path']
                if tex_path not in opened_images:
                    opened_images[tex_path] = Image.open(tex_path)
                img = opened_images[tex_path]

                x = sprite_info['x']
                y = sprite_info['y']
                w = sprite_info['width']
                h = sprite_info['height']

                # Bottom-left origin to top-left origin
                cropped_x = int(x)
                cropped_y = int(img.height - y - h)
                cropped_x2 = int(cropped_x + w)
                cropped_y2 = int(cropped_y + h)

                area = (cropped_x, cropped_y, cropped_x2, cropped_y2)
                cropped_image = img.crop(area)
                if cropped_image.size != (16, 16):
                    cropped_image = cropped_image.resize((16, 16), Image.Resampling.NEAREST)
                cropped_image.save(os.path.join('out/talents/image/', f'{icon_index}.png'))
            else:
                # Fallback transparent 16x16
                fallback = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
                fallback.save(os.path.join('out/talents/image/', f'{icon_index}.png'))

            icon_index += 1

    with open('out/talents/talent-data.json', 'w', encoding='utf-8') as file:
        file.write(json.dumps(talent_data, indent=2))

    print(f'Successfully extracted {icon_index} talents across {len(talent_data)} skills.')
