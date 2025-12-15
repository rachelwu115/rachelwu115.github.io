
from PIL import Image
import os

def create_silhouette(input_path, output_path, tolerance=40):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        datas = img.getdata()
        
        new_data = []
        # Get background color from top-left pixel
        bg_pixel = datas[0]
        bg_r, bg_g, bg_b, _ = bg_pixel

        for item in datas:
            r, g, b, a = item
            
            # Simple distance check (Manhattan distance as used in the JS code)
            diff = abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b)
            
            if diff < tolerance:
                # Background -> Transparent
                new_data.append((0, 0, 0, 0))
            else:
                # Silhouette -> Solid Black
                new_data.append((0, 0, 0, 255))

        img.putdata(new_data)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        img.save(output_path, "PNG")
        print(f"Saved silhouette to {output_path}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Adjust paths as needed for the environment
    base_dir = "/Users/tianyuwu/.gemini/antigravity/scratch/rachelwu115.github.io-main"
    input_file = os.path.join(base_dir, "images", "saitama-no-cape.png")
    output_file = os.path.join(base_dir, "assets", "images", "shadowman_silhouette.png")
    
    create_silhouette(input_file, output_file)
