import nodemailer from 'nodemailer';

// Configurar transportador de email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationCode: string,
  verificationLink: string,
) {
  const subject = 'Verifica tu correo - Internal Chat MVP';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>¡Bienvenido, ${name}!</h2>
      <p>Gracias por registrarte en Internal Chat MVP.</p>
      <p>Para completar tu registro, verifica tu correo haciendo clic en el botón de abajo:</p>
      <a href="${verificationLink}" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Verificar Correo
      </a>
      <p>O usa este código de verificación: <strong>${verificationCode}</strong></p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        Este enlace expira en 24 horas.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  const subject = 'Bienvenido a Internal Chat MVP';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>¡Hola, ${name}!</h2>
      <p>Tu correo ha sido verificado exitosamente.</p>
      <p>Ya puedes iniciar sesión en tu cuenta y comenzar a usar Internal Chat MVP.</p>
      <a href="${process.env.NEXT_PUBLIC_API_URL}/login" style="display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Ir a Login
      </a>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
