from PIL import Image
import numpy as np

def load_images(image_paths):
    return [Image.open(path) for path in image_paths]

def get_lightest_pixel(*pixels):
    return max(pixels, key=lambda pixel: sum(pixel))

def create_lightest_image(image_paths, output_path):
    images = load_images(image_paths)
    width, height = images[0].size

    # Ensure all images are the same size
    for img in images:
        if img.size != (width, height):
            raise ValueError("All images must have the same dimensions")

    # Convert images to numpy arrays for easier pixel manipulation
    arrays = [np.array(img) for img in images]

    # Create an empty array for the output image
    output_array = np.zeros_like(arrays[0])

    for x in range(width):
        for y in range(height):
            pixels = [array[y, x] for array in arrays]
            output_array[y, x] = get_lightest_pixel(*pixels)

    # Convert the output array back to an image
    output_image = Image.fromarray(output_array)
    output_image.save(output_path)

# Example usage
image_paths = ['trials/Trial_abilities.webp', 'trials/Trial_blood.webp', 'trials/Trial_bones.webp',"trials/Trial_power.webp","trials/Trial_toughness.webp","trials/Trial_tribes.webp"]
output_path = 'output_image.png'
create_lightest_image(image_paths, output_path)