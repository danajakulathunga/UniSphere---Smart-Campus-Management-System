package service;

import org.springframework.stereotype.Service;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

@Service
public class FileService {

    private final String UPLOAD_DIR = "uploads";

    public String saveBase64Image(String base64String, String subFolder) {
        return saveBase64File(base64String, subFolder);
    }

    public String saveBase64File(String base64String, String subFolder) {
        if (base64String == null || base64String.isEmpty()) {
            return null;
        }

        if (base64String.startsWith("/uploads/")) {
            return base64String;
        }

        try {
            String[] parts = base64String.split(",");
            String fileData;
            String extension = "bin"; 

            if (parts.length > 1) {
                fileData = parts[1];
                String meta = parts[0];
                if (meta.contains("image/png")) extension = "png";
                else if (meta.contains("image/jpeg") || meta.contains("image/jpg")) extension = "jpg";
                else if (meta.contains("image/webp")) extension = "webp";
                else if (meta.contains("application/pdf")) extension = "pdf";
                else if (meta.contains("application/vnd.openxmlformats-officedocument.presentationml.presentation")) extension = "pptx";
                else if (meta.contains("application/vnd.ms-powerpoint")) extension = "ppt";
                else if (meta.contains("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) extension = "docx";
                else if (meta.contains("application/msword")) extension = "doc";
                else if (meta.contains("text/plain")) extension = "txt";
            } else {
                fileData = parts[0];
            }

            byte[] decodedBytes = Base64.getDecoder().decode(fileData);

            Path path = Paths.get(UPLOAD_DIR, subFolder);
            if (!Files.exists(path)) {
                Files.createDirectories(path);
            }

            String fileName = UUID.randomUUID().toString() + "." + extension;
            File file = new File(path.toFile(), fileName);

            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(decodedBytes);
            }

            return "/uploads/" + subFolder + "/" + fileName;

        } catch (IOException | IllegalArgumentException e) {
            System.err.println("Error saving file: " + e.getMessage());
            return null;
        }
    }
}
