# Christex Foundation Website

## Gallery Management

### Option 1: Airtable (Recommended) - Outside of Code
You can now manage the gallery images without touching any code!

1.  **Create Table**: Create a table in your Airtable base named `Gallery`.
2.  **Add Field**: Add a field (column) named `Images` of type **Attachment**.
3.  **Upload**: Upload your images to the `Images` field (create one row per image or multiple images per row).
4.  **Connect**: Get the Table ID (it looks like `tbl...` in the URL) and add it to your `.env.local` file:
    ```
    AIRTABLE_GALLERY_TABLE_ID=tblYourTableIdHere
    ```
5.  **Done**: The website will now pull images from Airtable!

### Option 2: Local Files (Developer Mode / Fallback)
If you prefer not to use Airtable, or for local development if Airtable credentials are missing, you can drop image files into `public/images/gallery`.

-   Supported formats: JPG, PNG, GIF, WEBP.
-   **HEIC/DNG (Raw Photos)**: If you add raw photos from a phone/camera, run this command to convert them:
    ```bash
    npm run gallery:process
    ```

**Note**: Since you have set up Airtable, the website will prioritize images from there. The local folder is only used if the Airtable connection fails or returns no images.
