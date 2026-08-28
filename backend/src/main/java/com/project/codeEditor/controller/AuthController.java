package com.project.codeEditor.controller;
// import com.project.codeEditor.dto.GoogleLoginRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.project.codeEditor.dto.AuthResponse;
import com.project.codeEditor.dto.GoogleLoginRequest;
import com.project.codeEditor.dto.LoginRequest;
import com.project.codeEditor.dto.OtpResponse;
import com.project.codeEditor.dto.RegisterRequest;
import com.project.codeEditor.dto.SendOtpRequest;
import com.project.codeEditor.dto.VerifyOtpRequest;
import com.project.codeEditor.service.AuthService;
import com.project.codeEditor.service.OtpService;
@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private OtpService otpService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@RequestBody GoogleLoginRequest request) {
    return ResponseEntity.ok(authService.googleLogin(request));
}

    /**
     * Generates and "sends" (logs server-side — see OtpService) a 6-digit
     * code for the given phone number. Real, server-held state — not the
     * old hardcoded "123456" the frontend checked on its own.
     */
    @PostMapping("/send-otp")
    public ResponseEntity<OtpResponse> sendOtp(@RequestBody SendOtpRequest request) {
        if (request == null || request.getPhone() == null || request.getPhone().replaceAll("\\D", "").length() < 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid phone number.");
        }
        otpService.sendOtp(request.getPhone());
        return ResponseEntity.ok(new OtpResponse(true, "OTP sent."));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<OtpResponse> verifyOtp(@RequestBody VerifyOtpRequest request) {
        if (request == null || request.getPhone() == null || request.getOtp() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone and OTP are required.");
        }
        boolean ok = otpService.verifyOtp(request.getPhone(), request.getOtp());
        if (!ok) {
            return ResponseEntity.ok(new OtpResponse(false, "Incorrect or expired OTP. Please try again."));
        }
        return ResponseEntity.ok(new OtpResponse(true, "Phone verified."));
    }
}