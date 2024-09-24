import cv2
import numpy as np
import math
from PIL import Image

sus=cv2.imread('PackRat.webp')
orig=cv2.cvtColor(sus, cv2.COLOR_BGR2RGB)
image = cv2.cvtColor(sus, cv2.COLOR_BGR2GRAY)
# thresh=15

ch=[]
peaks=[]
# estimated=[3.12,3.12]
# inis=[1.15,1.25]
estimated=[]
inis=[]

for dir in range(2):
    size=image.shape[1-dir]-1
    ch.append([0]*size)
    peaks.append([])

    for h in range(image.shape[dir]):
        for i in range(image.shape[1-dir]-1):
            # if (dir==0 and abs(int(image[h,i]) - int(image[h,i+1])) > thresh) \
            # or (dir==1 and abs(int(image[i,h]) - int(image[i+1,h])) > thresh):
            #     ch[dir][i]+=1
            if (dir==0): ch[dir][i]+=abs(int(image[h,i]) - int(image[h,i+1]))
            else: ch[dir][i]+=abs(int(image[i,h]) - int(image[i+1,h]))

    for i in range(1, size - 1):
        if ch[dir][i]>image.shape[dir] and ch[dir][i] > ch[dir][i - 1] and ch[dir][i] > ch[dir][i + 1]:
            peaks[dir].append(i+(-ch[dir][i - 1]+ch[dir][i + 1])/(ch[dir][i + 1]+ch[dir][i]+ch[dir][i - 1]))

    sum=0
    measures=0
    avg=3.1

    for i in range(len(peaks[dir])-1):
        diff=peaks[dir][i+1]-peaks[dir][i]
        if diff>=5 or diff<=1:
            continue
        measures+=1
        sum+=diff

    avg=sum/measures
    estimated.append(avg)

for dir in range(2):
    # inis.append(math.fmod(peaks[dir][0]+avg/2,avg))

    sum=0
    measures=0

    for i in range(1,len(peaks[dir])-1):        
        mod=math.fmod(peaks[dir][i],estimated[0])-estimated[0]/2
        measures+=1
        sum+=mod

    res=sum/measures
    inis.append(res if res>0 else res+estimated[0])

def get_pixel_value(image, x, y):
    height, width, _ = image.shape
        
    # Ensure coordinates are within the image bounds
    if x < 0 or x >= width or y < 0 or y >= height:
        raise ValueError("Coordinates are out of image bounds.")
        
    # Get the integer and fractional parts of the coordinates
    x1, y1 = int(x), int(y)
    x2, y2 = min(x1 + 1, width - 1), min(y1 + 1, height - 1)
        
    fx, fy = x - x1, y - y1
        
    # Get the RGB values of the four surrounding pixels
    Q11 = image[y1, x1]
    Q21 = image[y1, x2]
    Q12 = image[y2, x1]
    Q22 = image[y2, x2]
        
    # Perform bilinear interpolation
    interpolated_value = (
        Q11 * (1 - fx) * (1 - fy) +
        Q21 * fx * (1 - fy) +
        Q12 * (1 - fx) * fy +
        Q22 * fx * fy
    )
        
    # Return the RGB values as a tuple
    return tuple(interpolated_value.astype(int))

newImg=[]
y_old=inis[0]

while y_old<image.shape[0]-0.5:
    x_old=inis[1]
    newImg.append([])
    while x_old<image.shape[1]-0.5:
        newImg[-1].append(orig[round(y_old)][round(x_old)])
        # newImg[-1].append(get_pixel_value(orig,x_old,y_old))
        x_old+=estimated[1]
    y_old+=estimated[0]

def create_image_from_array(array):
    img = Image.new('RGB', (len(array[0]), len(array)))
    pixels = img.load()

    for y in range(len(array)):
        for x in range(len(array[0])):
            p=array[y][x]
            pixels[x, y] = (p[0], p[1], p[2])

    return img

img = create_image_from_array(newImg)
img.save('output.png')