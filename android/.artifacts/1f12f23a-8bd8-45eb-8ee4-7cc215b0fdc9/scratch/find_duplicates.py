import os
from collections import defaultdict

res_dir = r"C:\Users\swami\Downloads\LC Goal Tracker\goalascent\android\app\src\main\res"
files_by_name = defaultdict(list)

for root, dirs, files in os.walk(res_dir):
    for file in files:
        name = os.path.splitext(file)[0]
        # In Android resources, the name is the identifier.
        # Files in different density folders with the same name are NOT duplicates.
        # But files in the SAME category (e.g. drawable) with different extensions ARE.
        # Also check across different categories if they share names (sometimes problematic).

        # Folder type (e.g. drawable, values, layout)
        folder_name = os.path.basename(root)
        folder_type = folder_name.split('-')[0]

        files_by_name[(folder_type, name)].append(os.path.join(root, file))

for (ftype, name), paths in files_by_name.items():
    if len(paths) > 1:
        # Check if they are in different configuration folders of the same type
        # e.g. drawable/icon.png and drawable-hdpi/icon.png is FINE.
        # But drawable/icon.png and drawable/icon.xml is NOT.

        folders = [os.path.basename(os.path.dirname(p)) for p in paths]
        if len(set(folders)) < len(folders):
             print(f"Duplicate in same folder type {ftype} and name {name}:")
             for p in paths:
                 print(f"  {p}")

        # Also check for different extensions in same logical folder
        base_folders = [os.path.basename(os.path.dirname(p)) for p in paths]
        unique_base_folders = set(base_folders)
        for bf in unique_base_folders:
            matches_in_folder = [p for p in paths if os.path.basename(os.path.dirname(p)) == bf]
            if len(matches_in_folder) > 1:
                print(f"COLLISION in {bf}:")
                for p in matches_in_folder:
                    print(f"  {p}")
