"""
Ultra Model Inspector — Run this OUTSIDE Blender (plain Python)
================================================================
Point GATE_TOOL_DIR at your gate_tool folder and run:
    python inspect_models.py

This will print the structure of each JSON model file so we know
exactly what format they're in before writing the Blender importer.
"""

import os
import json
import sys

# ============================================================
# CONFIGURE THIS PATH — point to your gate_tool directory
# ============================================================
GATE_TOOL_DIR = r"C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp\gate_tool"

MODEL_DIR = os.path.join(GATE_TOOL_DIR, "m")


def inspect_json(filepath, max_array_preview=5):
    """Inspect a JSON file and print its structure."""
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    print(f"\n{'='*60}")
    print(f"FILE: {os.path.relpath(filepath, GATE_TOOL_DIR)}")
    print(f"{'='*60}")
    
    def describe(obj, indent=0, path="root"):
        prefix = "  " * indent
        if isinstance(obj, dict):
            print(f"{prefix}{path}: dict with {len(obj)} keys: {list(obj.keys())}")
            for key in obj:
                describe(obj[key], indent + 1, key)
        elif isinstance(obj, list):
            if len(obj) == 0:
                print(f"{prefix}{path}: empty list")
            elif isinstance(obj[0], (int, float)):
                print(f"{prefix}{path}: number array, length={len(obj)}, first {max_array_preview}: {obj[:max_array_preview]}")
            elif isinstance(obj[0], list):
                print(f"{prefix}{path}: nested array, length={len(obj)}, first item length={len(obj[0])}")
                if obj[0]:
                    print(f"{prefix}  first item preview: {obj[0][:max_array_preview]}")
            elif isinstance(obj[0], dict):
                print(f"{prefix}{path}: array of {len(obj)} objects, first keys: {list(obj[0].keys())}")
                describe(obj[0], indent + 1, f"{path}[0]")
            else:
                print(f"{prefix}{path}: array of {len(obj)} {type(obj[0]).__name__}, first: {obj[:max_array_preview]}")
        elif isinstance(obj, str):
            preview = obj[:80] + "..." if len(obj) > 80 else obj
            print(f"{prefix}{path}: string = \"{preview}\"")
        elif isinstance(obj, (int, float)):
            print(f"{prefix}{path}: {type(obj).__name__} = {obj}")
        elif isinstance(obj, bool):
            print(f"{prefix}{path}: bool = {obj}")
        elif obj is None:
            print(f"{prefix}{path}: null")
        else:
            print(f"{prefix}{path}: {type(obj).__name__}")
    
    describe(data)


def walk_models():
    """Find and inspect all JSON files in the model directory."""
    if not os.path.exists(MODEL_DIR):
        print(f"ERROR: Model directory not found: {MODEL_DIR}")
        print("Update GATE_TOOL_DIR at the top of this script.")
        sys.exit(1)
    
    json_files = []
    for root, dirs, files in os.walk(MODEL_DIR):
        for f in files:
            if f.endswith('.json'):
                json_files.append(os.path.join(root, f))
    
    json_files.sort()
    
    print(f"Found {len(json_files)} JSON model files in {MODEL_DIR}")
    print(f"\nDirectory structure:")
    
    # Show directory tree first
    for root, dirs, files in os.walk(MODEL_DIR):
        level = root.replace(MODEL_DIR, '').count(os.sep)
        indent = '  ' * level
        dirname = os.path.basename(root)
        json_count = len([f for f in files if f.endswith('.json')])
        if json_count > 0:
            print(f"{indent}{dirname}/ ({json_count} json files)")
            sub_indent = '  ' * (level + 1)
            for f in sorted(files):
                if f.endswith('.json'):
                    size = os.path.getsize(os.path.join(root, f))
                    print(f"{sub_indent}{f} ({size:,} bytes)")
    
    # Inspect first file from each subdirectory to understand the format
    seen_dirs = set()
    for filepath in json_files:
        parent = os.path.dirname(filepath)
        if parent not in seen_dirs:
            seen_dirs.add(parent)
            inspect_json(filepath)
    
    # Also specifically inspect key Charleston files if they exist
    key_files = [
        "3/fs.json",     # spear finial
        "3/fp.json",     # plugged finial
    ]
    for kf in key_files:
        full = os.path.join(MODEL_DIR, kf)
        if os.path.exists(full) and full not in [json_files[0]]:
            inspect_json(full)


if __name__ == "__main__":
    walk_models()
