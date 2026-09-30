import { CONFIG } from "../config.js";

export interface MetaWhatsAppMessagePayload {
  messaging_product: "whatsapp";
  to: string;
  type: "text" | "template" | "interactive" | "audio";
  recipient_type?: "individual";

  text?: {
    body: string;
    preview_url?: boolean;
  };

  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };

  interactive?: any;

  audio?: {
    id?: string;
    link?: string;
    voice?: boolean;
  };
}

interface MetaApiResponse {
  messaging_product?: string;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
  }>;
  id?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    fbtrace_id?: string;
  };
}

export class WhatsAppService {
  private static baseUrl = "https://graph.facebook.com/v25.0";

  /**
   * Send text message to citizen via Meta WhatsApp Cloud API
   */
  public static async sendTextMessage(
    toPhone: string,
    text: string,
  ): Promise<MetaApiResponse> {
    this.validateConfig();

    const cleanPhone = this.cleanPhone(toPhone);

    const url = `${this.baseUrl}/${CONFIG.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const body: MetaWhatsAppMessagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: {
        body: text,
        preview_url: false,
      },
    };

    return this.postJson(url, body, "send text message");
  }

  /**
   * Fetch media URL from Meta WhatsApp API.
   *
   * The media ID comes from an incoming WhatsApp media webhook.
   */
  public static async getMediaUrl(mediaId: string): Promise<string | null> {
    if (!CONFIG.WHATSAPP_TOKEN) return null;

    try {
      const response = await fetch(`${this.baseUrl}/${mediaId}`, {
        headers: {
          Authorization: `Bearer ${CONFIG.WHATSAPP_TOKEN}`,
        },
      });

      const data = (await response.json()) as MetaApiResponse & {
        url?: string;
      };

      if (!response.ok) {
        console.error("[WhatsAppService] Failed to retrieve media URL:", data);
        return null;
      }

      return data.url || null;
    } catch (err) {
      console.error("[WhatsAppService] Failed to retrieve media URL:", err);
      return null;
    }
  }

  /**
   * Download actual media bytes from a Meta media URL.
   */
  public static async downloadMedia(
    mediaUrl: string,
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (!CONFIG.WHATSAPP_TOKEN) return null;

    try {
      const response = await fetch(mediaUrl, {
        headers: {
          Authorization: `Bearer ${CONFIG.WHATSAPP_TOKEN}`,
        },
      });

      if (!response.ok) {
        console.warn(
          "[WhatsAppService] Media download failed:",
          response.status,
        );
        return null;
      }

      const mimeType =
        response.headers.get("content-type")?.split(";")[0]?.trim() ||
        "audio/ogg";

      const arrayBuffer = await response.arrayBuffer();

      return {
        buffer: Buffer.from(arrayBuffer),
        mimeType,
      };
    } catch (err) {
      console.error("[WhatsAppService] Media download error:", err);
      return null;
    }
  }

  /**
   * Upload media to Meta and return the media ID.
   *
   * IMPORTANT:
   * WhatsApp Cloud API requires media to be uploaded to /media first.
   */
  private static async uploadMedia(
    audio: Buffer,
    mimeType: string,
  ): Promise<string> {
    this.validateConfig();

    const url = `${this.baseUrl}/${CONFIG.WHATSAPP_PHONE_NUMBER_ID}/media`;

    const extension = this.getAudioExtension(mimeType);

    const form = new FormData();

    form.append("messaging_product", "whatsapp");

    form.append(
      "file",
      new Blob([new Uint8Array(audio)], {
        type: mimeType,
      }),
      `reply.${extension}`,
    );

    form.append("type", mimeType);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.WHATSAPP_TOKEN}`,
      },
      body: form,
    });

    const data = (await response.json()) as MetaApiResponse;

    if (!response.ok || !data.id) {
      console.error("[WhatsAppService] Meta media upload failed:", data);

      throw new Error(data.error?.message || "Failed to upload WhatsApp media");
    }

    console.log(
      `[WhatsAppService] Media uploaded successfully. Media ID: ${data.id}`,
    );

    return data.id;
  }

  /**
   * Send an audio/voice message to a citizen.
   *
   * Flow:
   *
   * 1. Upload audio -> /media
   * 2. Receive media ID
   * 3. Send /messages with audio.id
   */
  public static async sendVoiceMessage(
    toPhone: string,
    audio: Buffer,
    mimeType = "audio/mpeg",
  ): Promise<MetaApiResponse> {
    this.validateConfig();

    const cleanPhone = this.cleanPhone(toPhone);

    try {
      // Step 1: Upload audio to Meta.
      const mediaId = await this.uploadMedia(audio, mimeType);

      // Step 2: Send the uploaded media as an audio message.
      const url = `${this.baseUrl}/${CONFIG.WHATSAPP_PHONE_NUMBER_ID}/messages`;

      const body: MetaWhatsAppMessagePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "audio",
        audio: {
          id: mediaId,
        },
      };

      const data = await this.postJson(url, body, "send voice message");

      console.log(`[WhatsAppService] Voice note sent to ${cleanPhone}`);

      return data;
    } catch (err) {
      console.error("[WhatsAppService] Voice message error:", err);
      throw err;
    }
  }

  /**
   * Send an interactive message (buttons or list) via Meta WhatsApp Cloud API.
   */
  public static async sendInteractiveMessage(
    toPhone: string,
    interactive: unknown,
  ): Promise<MetaApiResponse> {
    this.validateConfig();

    const cleanPhone = this.cleanPhone(toPhone);

    const url = `${this.baseUrl}/${CONFIG.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "interactive",
      interactive,
    };

    return this.postJson(url, body, "send interactive message");
  }

  /**
   * Department menu as a WhatsApp interactive LIST (up to 10 rows).
   * Buttons are limited to 3 by Meta, so a list is used for 7 departments.
   */
  public static async sendDepartmentMenu(
    toPhone: string,
    welcomeText = "Namaste! I am Nexa, your citizen grievance assistant. Please choose the department related to your problem 👇",
  ): Promise<MetaApiResponse> {
    return this.sendInteractiveMessage(toPhone, {
      type: "list",
      header: { type: "text", text: "Nexa Citizen Services" },
      body: { text: welcomeText },
      footer: { text: "Choose a department to start your complaint" },
      action: {
        button: "Choose department",
        sections: [
          {
            title: "Departments",
            rows: [
              {
                id: "dept_WATER_SUPPLY",
                title: "Water Supply",
                description: "Handpump, pipeline, drinking water",
              },
              {
                id: "dept_RURAL_ROADS",
                title: "Rural Roads",
                description: "Roads, bridges, culverts",
              },
              {
                id: "dept_POWER_GRID",
                title: "Electricity",
                description: "Power cuts, transformer",
              },
              {
                id: "dept_HEALTHCARE",
                title: "Healthcare",
                description: "PHC, hospital, vaccines",
              },
              {
                id: "dept_SANITATION",
                title: "Sanitation",
                description: "Drainage, waste, sewer",
              },
              {
                id: "dept_EDUCATION",
                title: "Education",
                description: "Schools, teachers",
              },
              {
                id: "dept_FLOOD_DRAINAGE",
                title: "Flood & Drainage",
                description: "Floods, waterlogging",
              },
            ],
          },
        ],
      },
    });
  }

  /**
   * Mark incoming citizen message as read.
   */
  public static async markMessageAsRead(messageId: string): Promise<void> {
    if (!CONFIG.WHATSAPP_TOKEN || !CONFIG.WHATSAPP_PHONE_NUMBER_ID) {
      return;
    }

    try {
      const url = `${this.baseUrl}/${CONFIG.WHATSAPP_PHONE_NUMBER_ID}/messages`;

      const body = {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CONFIG.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();

        console.warn("[WhatsAppService] Failed to mark message as read:", data);
      }
    } catch (err) {
      // Non-blocking.
      console.warn("[WhatsAppService] Mark-as-read failed:", err);
    }
  }

  /**
   * Common JSON POST helper.
   */
  private static async postJson(
    url: string,
    body: unknown,
    operation: string,
  ): Promise<MetaApiResponse> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as MetaApiResponse;

    if (!response.ok) {
      console.error(
        `[WhatsAppService] Meta API error while trying to ${operation}:`,
        data,
      );

      throw new Error(data.error?.message || `Failed to ${operation}`);
    }

    console.log(`[WhatsAppService] Successfully completed ${operation}:`, data);

    return data;
  }

  /**
   * Validate required WhatsApp configuration.
   */
  private static validateConfig(): void {
    if (!CONFIG.WHATSAPP_TOKEN || !CONFIG.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error(
        "WhatsApp credentials not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env",
      );
    }
  }

  /**
   * Normalize phone number.
   */
  private static cleanPhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  /**
   * Determine a filename extension for uploaded audio.
   */
  private static getAudioExtension(mimeType: string): string {
    if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
      return "mp3";
    }

    if (mimeType.includes("mp4")) {
      return "m4a";
    }

    if (mimeType.includes("aac")) {
      return "aac";
    }

    if (mimeType.includes("amr")) {
      return "amr";
    }

    if (mimeType.includes("ogg")) {
      return "ogg";
    }

    return "audio";
  }
}
