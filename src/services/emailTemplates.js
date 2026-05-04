// src/services/emailTemplates.js
//
// Localized PIN reset email templates. One subject + html + text per language.
// Languages match the mobile app's translation set.

const STRINGS = {
  en: {
    subject: "Your Coachly PIN reset code",
    heading: "Reset your PIN",
    body:
      "Use the code below to reset your PIN. It expires in 15 minutes. " +
      "If you didn't request this, you can safely ignore this email.",
    codeLabel: "Your code",
    footer: "Coachly · qupda.com",
  },
  no: {
    subject: "Tilbakestillingskode for Coachly-PIN",
    heading: "Tilbakestill PIN-koden din",
    body:
      "Bruk koden under for å tilbakestille PIN-koden din. Den utløper om 15 minutter. " +
      "Hvis du ikke ba om dette, kan du ignorere e-posten.",
    codeLabel: "Koden din",
    footer: "Coachly · qupda.com",
  },
  da: {
    subject: "Nulstillingskode til din Coachly-PIN",
    heading: "Nulstil din PIN",
    body:
      "Brug koden nedenfor til at nulstille din PIN. Den udløber om 15 minutter. " +
      "Hvis du ikke har bedt om dette, kan du ignorere mailen.",
    codeLabel: "Din kode",
    footer: "Coachly · qupda.com",
  },
  sv: {
    subject: "Återställningskod för din Coachly-PIN",
    heading: "Återställ din PIN-kod",
    body:
      "Använd koden nedan för att återställa din PIN. Den gäller i 15 minuter. " +
      "Om du inte har begärt detta kan du bortse från meddelandet.",
    codeLabel: "Din kod",
    footer: "Coachly · qupda.com",
  },
  fi: {
    subject: "Coachly PIN-koodin nollauskoodi",
    heading: "Nollaa PIN-koodisi",
    body:
      "Käytä alla olevaa koodia PIN-koodin nollaamiseen. Se vanhenee 15 minuutissa. " +
      "Jos et pyytänyt tätä, voit jättää viestin huomiotta.",
    codeLabel: "Koodisi",
    footer: "Coachly · qupda.com",
  },
  nl: {
    subject: "Je Coachly PIN-resetcode",
    heading: "Reset je PIN",
    body:
      "Gebruik de onderstaande code om je PIN te resetten. De code verloopt over 15 minuten. " +
      "Als je dit niet hebt aangevraagd, kun je deze e-mail negeren.",
    codeLabel: "Je code",
    footer: "Coachly · qupda.com",
  },
  de: {
    subject: "Dein Coachly PIN-Zurücksetzungscode",
    heading: "PIN zurücksetzen",
    body:
      "Verwende den Code unten, um deine PIN zurückzusetzen. Er läuft in 15 Minuten ab. " +
      "Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.",
    codeLabel: "Dein Code",
    footer: "Coachly · qupda.com",
  },
  fr: {
    subject: "Votre code de réinitialisation du PIN Coachly",
    heading: "Réinitialiser votre PIN",
    body:
      "Utilisez le code ci-dessous pour réinitialiser votre PIN. Il expire dans 15 minutes. " +
      "Si vous n'avez pas fait cette demande, vous pouvez ignorer cet e-mail.",
    codeLabel: "Votre code",
    footer: "Coachly · qupda.com",
  },
  it: {
    subject: "Il tuo codice di reset PIN per Coachly",
    heading: "Reimposta il tuo PIN",
    body:
      "Usa il codice qui sotto per reimpostare il PIN. Scade tra 15 minuti. " +
      "Se non hai richiesto questa operazione, puoi ignorare l'email.",
    codeLabel: "Il tuo codice",
    footer: "Coachly · qupda.com",
  },
  es: {
    subject: "Tu código para restablecer el PIN de Coachly",
    heading: "Restablece tu PIN",
    body:
      "Usa el siguiente código para restablecer tu PIN. Caduca en 15 minutos. " +
      "Si no solicitaste esto, puedes ignorar este correo.",
    codeLabel: "Tu código",
    footer: "Coachly · qupda.com",
  },
  pl: {
    subject: "Kod resetowania PIN-u Coachly",
    heading: "Zresetuj swój PIN",
    body:
      "Użyj poniższego kodu, aby zresetować PIN. Wygasa za 15 minut. " +
      "Jeśli nie prosiłeś o tę zmianę, możesz zignorować tę wiadomość.",
    codeLabel: "Twój kod",
    footer: "Coachly · qupda.com",
  },
  pt: {
    subject: "O teu código de redefinição de PIN do Coachly",
    heading: "Redefine o teu PIN",
    body:
      "Usa o código abaixo para redefinir o teu PIN. Expira em 15 minutos. " +
      "Se não pediste isto, podes ignorar este e-mail.",
    codeLabel: "O teu código",
    footer: "Coachly · qupda.com",
  },
};

function get(lang) {
  return STRINGS[lang] || STRINGS.en;
}

export function pinResetEmailSubject(lang) {
  return get(lang).subject;
}

/**
 * Plain-text fallback. Some email clients (Apple Mail in low-data mode,
 * watch-based notifications, etc.) render the text part instead of HTML.
 */
export function pinResetEmailText(code, lang) {
  const s = get(lang);
  return `${s.heading}

${s.body}

${s.codeLabel}: ${code}

—
${s.footer}
`;
}

/**
 * Branded HTML email. Inline styles only — most email clients strip <style>
 * tags or render them inconsistently. Layout is a single 600px-wide table
 * (the email-safe equivalent of a flex column).
 */
export function pinResetEmailHtml(code, lang) {
  const s = get(lang);
  // Steel-blue accent matches the mobile app
  const ACCENT = "#4A7AB5";
  const TEXT = "#1F2937";
  const MUTED = "#6B7280";
  const BG = "#F4F6F8";
  const CARD = "#FFFFFF";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${s.subject}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:${CARD};border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 40px 8px 40px;">
              <div style="font-size:14px;font-weight:700;letter-spacing:3px;color:${ACCENT};">COACHLY</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <h1 style="margin:8px 0 16px 0;font-size:24px;font-weight:700;color:${TEXT};">${s.heading}</h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:22px;color:${TEXT};">${s.body}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 8px 40px;">
              <div style="font-size:12px;font-weight:600;letter-spacing:1px;color:${MUTED};text-transform:uppercase;margin-bottom:8px;">${s.codeLabel}</div>
              <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:${ACCENT};font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;padding:16px 0;">${code}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 32px 40px;border-top:1px solid #E5E7EB;margin-top:24px;">
              <p style="margin:24px 0 0 0;font-size:12px;color:${MUTED};">${s.footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
