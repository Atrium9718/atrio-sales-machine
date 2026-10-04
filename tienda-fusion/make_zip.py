#!/usr/bin/env python3
import os
import sys
import zipfile
import shutil

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
ZIP_FILENAME = "fusion-grafica-w2p-v2.0.zip"
ZIP_PATH = os.path.join(ROOT_DIR, ZIP_FILENAME)
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")
PUBLIC_ZIP_PATH = os.path.join(PUBLIC_DIR, ZIP_FILENAME)
PUBLIC_ZIP_ALT = os.path.join(PUBLIC_DIR, "fusion-w2p-software.zip")
ROOT_ZIP_ALT = os.path.join(ROOT_DIR, "fusion-w2p-software.zip")

EXCLUDE_DIRS = {
    'node_modules',
    '.git',
    'dist',
    '__pycache__',
    '.turbo',
    '.next',
    '.cache',
}

EXCLUDE_EXTENSIONS = {
    '.pyc',
    '.zip',
    '.log',
}

EXCLUDE_FILES = {
    'make_zip.py',
    'generate_zip.py',
}

def should_exclude(rel_path):
    parts = rel_path.split(os.sep)
    for p in parts:
        if p in EXCLUDE_DIRS:
            return True
        if p.startswith('.'):
            if p not in ('.env.example', '.gitignore'):
                return True
    
    filename = os.path.basename(rel_path)
    if filename in EXCLUDE_FILES:
        return True
    if filename.startswith('update_') and filename.endswith('.py'):
        return True
    
    _, ext = os.path.splitext(filename)
    if ext in EXCLUDE_EXTENSIONS:
        return True
        
    return False

def create_archive():
    print(f"📦 Generating project archive: {ZIP_FILENAME}...")
    file_count = 0
    total_uncompressed_bytes = 0

    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    # Remove existing zip if any
    if os.path.exists(ZIP_PATH):
        os.remove(ZIP_PATH)

    with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for root, dirs, files in os.walk(ROOT_DIR):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not (d.startswith('.') and d not in ('.env.example',))]
            
            for file in files:
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, ROOT_DIR)
                
                if should_exclude(rel_path):
                    continue
                
                # Prepend root folder inside zip for clean extraction: fusion-grafica-w2p/
                archive_name = os.path.join("fusion-grafica-w2p", rel_path)
                
                zipf.write(abs_path, archive_name)
                file_count += 1
                total_uncompressed_bytes += os.path.getsize(abs_path)

    zip_size_bytes = os.path.getsize(ZIP_PATH)
    zip_size_mb = zip_size_bytes / (1024 * 1024)
    raw_size_mb = total_uncompressed_bytes / (1024 * 1024)
    
    print(f"✅ Archive created successfully!")
    print(f"   Files included: {file_count}")
    print(f"   Original size: {raw_size_mb:.2f} MB")
    print(f"   Compressed size: {zip_size_mb:.2f} MB")
    print(f"   Location: {ZIP_PATH}")
    
    # Copy to public directory and alternates
    shutil.copy2(ZIP_PATH, PUBLIC_ZIP_PATH)
    shutil.copy2(ZIP_PATH, PUBLIC_ZIP_ALT)
    shutil.copy2(ZIP_PATH, ROOT_ZIP_ALT)
    print(f"   Copied to: {PUBLIC_ZIP_PATH}")
    print(f"   Copied to: {PUBLIC_ZIP_ALT}")
    print(f"   Copied to: {ROOT_ZIP_ALT}")

    # Verify zip integrity
    print("🔍 Testing archive integrity...")
    with zipfile.ZipFile(ZIP_PATH, 'r') as zipf:
        bad_file = zipf.testzip()
        if bad_file:
            print(f"❌ Corrupt file detected in zip: {bad_file}")
            sys.exit(1)
        else:
            print("✨ Zip integrity test PASSED 100%!")

if __name__ == "__main__":
    create_archive()
