from PIL import Image
from collections import deque
import sys
import math

def color_dist(c1, c2):
    # Euclidean distance in RGB (ignore Alpha for diff)
    return math.sqrt(sum((a-b)**2 for a, b in zip(c1[:3], c2[:3])))

def process(in_path, out_path):
    print(f"Processing {in_path}...")
    try:
        img = Image.open(in_path).convert("RGBA")
        pixels = img.load()
        w, h = img.size
        
        # Strategy: Smart Background Detection using Flood Fill from Corners.
        # This assumes the character doesn't touch the corners significantly.
        # This handles Green Screen, White BG, or Transparent BG automatically.
        
        # 0 = Unknown, 1 = Background, 2 = Foreground
        status = [[0 for _ in range(h)] for _ in range(w)]
        
        seeds = [(0,0), (w-1,0), (0,h-1), (w-1,h-1)]
        
        # Tolerance for background color variation (e.g. uneven lighting)
        TOLERANCE = 30 
        
        for sx, sy in seeds:
            if status[sx][sy] != 0: continue
            
            # Sample reference color from this corner
            ref_color = pixels[sx, sy]
            
            # BFS flood fill for similar colors
            q = deque([(sx, sy)])
            status[sx][sy] = 1 # Mark as BG
            
            while q:
                cx, cy = q.popleft()
                for dx, dy in [(1,0), (-1,0), (0,1), (0,-1)]:
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        if status[nx][ny] == 0:
                            curr_color = pixels[nx, ny]
                            # If alpha is 0, it's definitely background
                            if curr_color[3] < 10:
                                status[nx][ny] = 1
                                q.append((nx, ny))
                            # If color is similar to reference corner color
                            elif color_dist(curr_color, ref_color) < TOLERANCE:
                                status[nx][ny] = 1
                                q.append((nx, ny))
                                
        # Now: 
        # 1 = Background (connected to corners)
        # 0 = Foreground (Body) + Internal Holes (Background not connected to outside)
        
        # Wait, if there are Internal Holes (e.g. loop in arm), they are 0.
        # User wants "Background showing through" -> Transparent.
        # User said "not make the whole shadowman art piece black, just within his silouette".
        # This implies he wants the SILHOUETTE (Body) to be Black, and BG to be Transparent.
        # But previous request said "fill him... parts of background showing through".
        # This implies he wanted holes FILLED.
        # So: Internal Holes (0) should be treated as BODY (Filled).
        # External Background (1) should be Transparent.
        
        # So effectively: 
        # If status == 1 -> Transparent.
        # If status == 0 -> Black.
        
        out = Image.new("RGBA", (w, h), (0,0,0,0))
        out_pix = out.load()
        
        for y in range(h):
            for x in range(w):
                if status[x][y] == 1:
                    out_pix[x,y] = (0,0,0,0) # Background
                else:
                    out_pix[x,y] = (0,0,0,255) # Body (Solid Black)
                    
        out.save(out_path)
        print("Done.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    process('images/saitama-no-cape.png', 'assets/images/shadowman_silhouette.png')
