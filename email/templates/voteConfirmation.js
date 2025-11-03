/**
 * Vote Confirmation Email Template
 * Theme: Warm pinks + soft gold with confetti glow
 * Message: "You Made Her Day"
 */

/**
 * Generate Vote Confirmation email HTML
 * 
 * @param {Object} data - Template data
 * @param {string} data.modelName - Name of the model who received the vote
 * @param {string} data.profileUrl - URL to the model's profile for sharing
 * @returns {string} HTML email content
 */
export function generateVoteConfirmationHTML(data) {
  const { modelName, profileUrl = '#' } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vote Confirmation</title>
  <!--[if mso]>
  <style>
    table {border-collapse:collapse;border-spacing:0;border:none;margin:0;}
    div, td {padding:0;}
    div {margin:0 !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #ffeef8 0%, #fff5f0 100%); min-height: 100vh;">
  
  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Email Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background: #ffffff; border-radius: 28px; box-shadow: 0 24px 64px rgba(255, 105, 180, 0.2), 0 8px 24px rgba(255, 105, 180, 0.15); overflow: hidden;">
          
          <!-- Hero Section with Animated Confetti -->
          <tr>
            <td style="background: linear-gradient(135deg, #ff1493 0%, #ff69b4 50%, #ffb6d9 100%); padding: 70px 40px; text-align: center; position: relative;">
              
              <!-- Sparkle Decorations -->
              <div style="position: absolute; top: 25px; left: 30px; font-size: 32px; opacity: 0.8;">✨</div>
              <div style="position: absolute; top: 50px; right: 40px; font-size: 28px; opacity: 0.7;">💖</div>
              <div style="position: absolute; bottom: 40px; left: 50px; font-size: 36px; opacity: 0.8;">🎉</div>
              <div style="position: absolute; bottom: 60px; right: 35px; font-size: 30px; opacity: 0.7;">⭐</div>
              
              <!-- Hero Text -->
              <h1 style="margin: 0 0 25px 0; font-size: 48px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 3px; text-shadow: 0 4px 16px rgba(0,0,0,0.25); line-height: 1.2;">
                VOTE<br>CONFIRMED! 🎉
              </h1>
              
              <!-- Checkmark Icon with Glow -->
              <div style="margin: 35px auto; width: 100px; height: 100px; background: #ffffff; border-radius: 50%; display: inline-block; box-shadow: 0 12px 32px rgba(0,0,0,0.2), 0 0 0 8px rgba(255,255,255,0.2); padding: 25px;">
                <svg width="50" height="50" viewBox="0 0 50 50" style="display: block;">
                  <polyline points="10,25 20,35 40,15" fill="none" stroke="#ff69b4" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </td>
          </tr>
          
          <!-- Content Section -->
          <tr>
            <td style="padding: 50px 40px; text-align: center;">
              
              <!-- Header with Icon -->
              <div style="margin: 0 0 25px 0;">
                <div style="display: inline-block; background: linear-gradient(135deg, #ff69b4 0%, #ff1493 100%); width: 60px; height: 60px; border-radius: 16px; margin-bottom: 20px; padding: 12px; box-shadow: 0 8px 20px rgba(255, 105, 180, 0.3);">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style="display: block;">
                    <path d="M18 4L21 14H31L23 20L26 30L18 24L10 30L13 20L5 14H15L18 4Z" fill="white" opacity="0.9"/>
                  </svg>
                </div>
                <h2 style="margin: 0; font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #ff1493 0%, #ff69b4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.3;">
                  Your Vote Made a Difference!
                </h2>
              </div>
              
              <!-- Body Text with Better Typography -->
              <p style="margin: 0 0 18px 0; font-size: 19px; color: #2d2d2d; line-height: 1.7; font-weight: 500;">
                You helped <span style="background: linear-gradient(135deg, #ff69b4 0%, #ff1493 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 700; font-size: 20px;">${modelName}</span> climb closer to the CoverGirl crown! 👑
              </p>
              
              <!-- Highlight Box -->
              <div style="background: linear-gradient(135deg, rgba(255, 105, 180, 0.08) 0%, rgba(255, 20, 147, 0.08) 100%); border-left: 4px solid #ff69b4; border-radius: 12px; padding: 20px; margin: 25px 0 35px 0;">
                <p style="margin: 0; font-size: 16px; color: #555555; line-height: 1.6;">
                  💡 <strong style="color: #ff1493;">Pro tip:</strong> Share her link with your friends — every click brings her closer to victory!
                </p>
              </div>
              
              <!-- CTA Button with Hover Effect -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="border-radius: 50px; background: linear-gradient(135deg, #ff1493 0%, #ff69b4 100%); box-shadow: 0 12px 35px rgba(255, 105, 180, 0.4), 0 0 0 0 rgba(255, 105, 180, 0.3);">
                    <a href="${profileUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff1493 0%, #ff69b4 100%); color: #ffffff; font-size: 17px; font-weight: 700; text-decoration: none; padding: 20px 55px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1.5px; border: none;">
                      Share Her Profile 🚀
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer Section -->
          <tr>
            <td style="background: linear-gradient(to bottom, #ffffff 0%, #fff9fc 100%); padding: 40px 40px; text-align: center; border-top: 1px solid #ffe0ef;">
              
              <!-- Social Icons Row -->
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #999999;">
                Follow us on social media
              </p>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="padding: 0 10px;">
                    <a href="#" style="display: inline-block; width: 40px; height: 40px; background: #ff69b4; border-radius: 50%; text-align: center; line-height: 40px; color: #ffffff; text-decoration: none; font-size: 18px;">f</a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="#" style="display: inline-block; width: 40px; height: 40px; background: #ff69b4; border-radius: 50%; text-align: center; line-height: 40px; color: #ffffff; text-decoration: none; font-size: 18px;">𝕏</a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="#" style="display: inline-block; width: 40px; height: 40px; background: #ff69b4; border-radius: 50%; text-align: center; line-height: 40px; color: #ffffff; text-decoration: none; font-size: 18px;">in</a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="#" style="display: inline-block; width: 40px; height: 40px; background: #ff69b4; border-radius: 50%; text-align: center; line-height: 40px; color: #ffffff; text-decoration: none; font-size: 18px;">📷</a>
                  </td>
                </tr>
              </table>
              
              <!-- Footer Text -->
              <p style="margin: 30px 0 0 0; font-size: 12px; color: #aaaaaa; line-height: 1.5;">
                © 2025 CoverGirl Contest. All rights reserved.<br>
                You're receiving this because you voted in our contest.
              </p>
              
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim();
}

export default generateVoteConfirmationHTML;

