import os
import xml.etree.ElementTree as ET
from collections import defaultdict

res_dir = r"C:\Users\swami\Downloads\LC Goal Tracker\goalascent\android\app\src\main\res"
names = defaultdict(list)

for root, dirs, files in os.walk(res_dir):
    for file in files:
        path = os.path.join(root, file)
        folder_name = os.path.basename(root)
        folder_type = folder_name.split('-')[0]

        if file.endswith('.xml'):
            if folder_type == 'values':
                try:
                    tree = ET.parse(path)
                    root_node = tree.getroot()
                    for child in root_node:
                        name = child.get('name')
                        if name:
                            res_type = child.tag
                            names[(res_type, name)].append(path)
                except:
                    pass
            else:
                name = os.path.splitext(file)[0]
                names[(folder_type, name)].append(path)
        elif file.endswith('.png') or file.endswith('.jpg'):
            name = os.path.splitext(file)[0]
            names[(folder_type, name)].append(path)

for (rtype, name), paths in names.items():
    if len(paths) > 1:
        folders = [os.path.basename(os.path.dirname(p)) for p in paths]
        if len(set(folders)) < len(folders):
             print(f"Duplicate {rtype} named '{name}':")
             for p in paths:
                 print(f"  {p}")
