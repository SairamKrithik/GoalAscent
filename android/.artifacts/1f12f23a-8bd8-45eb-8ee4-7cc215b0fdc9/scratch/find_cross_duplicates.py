import os
from collections import defaultdict

root_dir = r"C:\Users\swami\Downloads\LC Goal Tracker\goalascent\android"
res_files = defaultdict(list)

for root, dirs, files in os.walk(root_dir):
    if 'src' in root and 'main' in root and 'res' in root:
        for file in files:
            if file == ".gitkeep": continue
            name = os.path.splitext(file)[0]
            folder_name = os.path.basename(root)
            folder_type = folder_name.split('-')[0]

            # Key by folder_type and name
            res_files[(folder_type, folder_name, name)].append(os.path.join(root, file))

for key, paths in res_files.items():
    if len(paths) > 1:
        print(f"Collision for {key}:")
        for p in paths:
            print(f"  {p}")
