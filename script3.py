import cv2
import numpy as np
import math
from PIL import Image

image=cv2.imread('haru kaze.png',cv2.IMREAD_UNCHANGED)
newImg=np.copy(image)

for y in range(len(image)):
    for x in range(len(image[0])):
        for k in range(3):
            newImg[y][x][k]=0
        if np.all(image[y][x]==(63,63,63,255)):
            newImg[y][x][3]=128
        else:
            newImg[y][x][3]=image[y][x][3]

cv2.imwrite("output_boulder.png", newImg)