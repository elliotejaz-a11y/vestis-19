import modal

app = modal.App("vestis-bg-removal")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("rembg[cpu]", "Pillow", "fastapi", "python-multipart")
)


@app.function(image=image, cpu=2, memory=2048, timeout=120)
@modal.web_endpoint(method="POST")
def remove_background(body: dict) -> dict:
    import base64
    import time
    from io import BytesIO

    from PIL import Image
    from rembg import remove

    start = time.time()

    image_bytes = base64.b64decode(body["imageBase64"])
    img = Image.open(BytesIO(image_bytes)).convert("RGBA")
    result = remove(img)

    buf = BytesIO()
    result.save(buf, format="PNG")
    elapsed = round(time.time() - start, 2)

    return {
        "imageBase64": base64.b64encode(buf.getvalue()).decode(),
        "processingSeconds": elapsed,
    }
