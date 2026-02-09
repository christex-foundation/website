#!/bin/bash

# Configuration
GALLERY_DIR="public/images/gallery"

# Ensure gallery directory exists
if [ ! -d "$GALLERY_DIR" ]; then
    echo "Gallery directory '$GALLERY_DIR' not found."
    exit 1
fi

echo "Processing images in $GALLERY_DIR..."
count=0

# Convert HEIC/DNG (and other formats if needed) to JPG using sips (macOS tool)
# Case-insensitive matching for extensions
shopt -s nullglob nocaseglob

for file in "$GALLERY_DIR"/*.{heic,dng}; do
    if [ -f "$file" ]; then
        filename=$(basename -- "$file")
        filename_no_ext="${filename%.*}"
        jpg_file="$GALLERY_DIR/${filename_no_ext}.jpg"

        if [ ! -f "$jpg_file" ]; then
            echo "Converting: $filename -> ${filename_no_ext}.jpg"
            sips -s format jpeg "$file" --out "$jpg_file" > /dev/null
            ((count++))
        fi
    fi
done

echo "Done! Processed $count new images."
echo "If you added new JPG/PNG files directly, they are already ready."
