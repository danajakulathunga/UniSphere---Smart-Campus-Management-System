package dto;

public class ForgotPasswordResponse {

    private String message;
    private String verificationCode;

    public ForgotPasswordResponse() {
    }

    public ForgotPasswordResponse(String message, String verificationCode) {
        this.message = message;
        this.verificationCode = verificationCode;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getVerificationCode() {
        return verificationCode;
    }

    public void setVerificationCode(String verificationCode) {
        this.verificationCode = verificationCode;
    }
}

