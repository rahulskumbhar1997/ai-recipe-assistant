import { Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { backendBaseUrl } from './backend.config';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly uploadEndpoint = `${backendBaseUrl}/upload-image`;
  private readonly chatEndpoint = `${backendBaseUrl}/chat`;
  private selectedImageFile: File | null = null;
  private cameraStream: MediaStream | null = null;
  private capturedImageObjectUrl: string | null = null;

  @ViewChild('cameraVideo') private cameraVideo?: ElementRef<HTMLVideoElement>;

  protected readonly title = signal('AI Recipe assistant');
  protected selectedImageName = signal('No image selected');
  protected analyseStatus = signal('Upload a dish image and click Analyse.');
  protected cameraStatus = signal('');
  protected capturedImagePreview = signal<string | null>(null);
  protected isCameraSupported = signal(
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  );
  protected isCameraActive = signal(false);
  protected chatInput = '';
  protected isUploading = signal(false);
  protected isChatLoading = signal(false);
  protected chatMessages = signal<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Welcome! Upload an image and ask anything about your recipe.',
    },
  ]);

  constructor(private readonly http: HttpClient) {}

  ngOnDestroy(): void {
    this.stopCamera();
    this.clearCapturedImagePreview();
  }

  protected onImageSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files && target.files.length > 0 ? target.files[0] : null;

    if (!file) {
      this.selectedImageFile = null;
      this.selectedImageName.set('No image selected');
      return;
    }

    this.selectedImageFile = file;
    this.selectedImageName.set(file.name);
  }

  protected analyseRecipeImage(): void {
    if (!this.selectedImageFile) {
      this.analyseStatus.set('Please select an image first.');
      return;
    }

    const payload = new FormData();
    payload.append('image', this.selectedImageFile);

    this.isUploading.set(true);
    this.analyseStatus.set('Uploading image and sending analyse request...');

    this.http.post<{ message: string }>(this.uploadEndpoint, payload).subscribe({
      next: (response) => {
        this.analyseStatus.set(response.message);
        this.isUploading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.analyseStatus.set(
          this.getApiErrorMessage(
            error,
            'Failed to send image. Check backend host/port and CORS settings.',
          ),
        );
        this.isUploading.set(false);
      },
    });
  }

  protected async startCamera(): Promise<void> {
    if (!this.isCameraSupported()) {
      this.cameraStatus.set('Camera is not available in this browser or device.');
      return;
    }

    try {
      this.stopCamera();

      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      const video = this.cameraVideo?.nativeElement;
      if (!video) {
        this.cameraStatus.set('Unable to access camera preview element.');
        this.stopCamera();
        return;
      }

      video.srcObject = this.cameraStream;
      await video.play();
      this.isCameraActive.set(true);
      this.cameraStatus.set('Camera started. Click Capture Picture.');
    } catch {
      this.cameraStatus.set('Unable to access camera. Please allow camera permission.');
      this.stopCamera();
    }
  }

  protected async capturePicture(): Promise<void> {
    const video = this.cameraVideo?.nativeElement;
    if (!video || !this.isCameraActive()) {
      this.cameraStatus.set('Start camera first to capture a picture.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const context = canvas.getContext('2d');
    if (!context) {
      this.cameraStatus.set('Could not capture image from camera.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((capturedBlob) => resolve(capturedBlob), 'image/jpeg', 0.92);
    });

    if (!blob) {
      this.cameraStatus.set('Could not capture image from camera.');
      return;
    }

    const fileName = `camera-capture-${Date.now()}.jpg`;
    this.selectedImageFile = new File([blob], fileName, { type: 'image/jpeg' });
    this.selectedImageName.set(fileName);
    this.setCapturedImagePreview(blob);
    this.cameraStatus.set('Picture captured and selected for upload.');
    this.stopCamera();
  }

  protected recapturePicture(): void {
    this.selectedImageFile = null;
    this.selectedImageName.set('No image selected');
    this.clearCapturedImagePreview();
    void this.startCamera();
  }

  protected stopCamera(): void {
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.cameraStream = null;

    const video = this.cameraVideo?.nativeElement;
    if (video) {
      video.srcObject = null;
    }

    this.isCameraActive.set(false);
  }

  private setCapturedImagePreview(blob: Blob): void {
    this.clearCapturedImagePreview();
    this.capturedImageObjectUrl = URL.createObjectURL(blob);
    this.capturedImagePreview.set(this.capturedImageObjectUrl);
  }

  private clearCapturedImagePreview(): void {
    if (this.capturedImageObjectUrl) {
      URL.revokeObjectURL(this.capturedImageObjectUrl);
      this.capturedImageObjectUrl = null;
    }
    this.capturedImagePreview.set(null);
  }

  protected sendMessage(): void {
    const message = this.chatInput.trim();
    if (!message) {
      return;
    }

    this.chatMessages.update((messages) => [...messages, { role: 'user', content: message }]);
    this.chatInput = '';
    this.isChatLoading.set(true);

    this.http.post<{ message: string }>(this.chatEndpoint, { message }).subscribe({
      next: (response) => {
        this.chatMessages.update((messages) => [
          ...messages,
          {
            role: 'assistant',
            content: this.normalizeAssistantMessage(
              response.message || 'No response message received from backend.',
            ),
          },
        ]);
        this.isChatLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.chatMessages.update((messages) => [
          ...messages,
          {
            role: 'assistant',
            content: this.getApiErrorMessage(
              error,
              'Unable to reach /chat endpoint. Please check backend host, port, and CORS.',
            ),
          },
        ]);
        this.isChatLoading.set(false);
      },
    });
  }

  private getApiErrorMessage(error: HttpErrorResponse, fallbackMessage: string): string {
    const apiMessage =
      typeof error.error === 'string'
        ? error.error
        : (error.error?.message as string | undefined) || error.message;

    if (error.status === 429) {
      return apiMessage || 'Too many requests. Please wait and try again.';
    }

    return apiMessage || fallbackMessage;
  }

  private normalizeAssistantMessage(message: string): string {
    const normalized = message
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'")
      .replaceAll('&amp;', '&');

    if (normalized.includes('<')) {
      return normalized;
    }

    return normalized.replaceAll('\n', '<br/>');
  }
}
