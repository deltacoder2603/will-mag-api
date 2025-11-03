/**
 * Reward Delivery Email Template
 * Theme: White + gold palette with shimmer on CTA
 * Message: "You Earned This"
 */

/**
 * Generate Reward Delivery email HTML
 * 
 * @param {Object} data - Template data
 * @param {string} data.rewardName - Name of the reward
 * @param {string} data.rewardDescription - Description of the reward
 * @param {string} data.expiryDate - Expiration date for claiming
 * @param {string} data.claimUrl - URL to claim the reward
 * @returns {string} HTML email content
 */
export function generateRewardDeliveryHTML(data) {
  const { 
    rewardName = 'Exclusive Reward', 
    rewardDescription = 'A special gift for your participation',
    expiryDate = 'Soon',
    claimUrl = '#'
  } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reward Unlocked</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #fffef7 0%, #fff9e6 100%); min-height: 100vh;">
  
  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Email Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background: #ffffff; border-radius: 24px; box-shadow: 0 20px 60px rgba(255, 215, 0, 0.25); overflow: hidden; border: 3px solid #ffd700;">
          
          <!-- Hero Section with Gift Box -->
          <tr>
            <td style="background: linear-gradient(135deg, #ffffff 0%, #fffef7 100%); padding: 60px 40px; text-align: center; position: relative; overflow: hidden;">
              
              <!-- Sparkle Effects -->
              <div style="position: absolute; top: 30px; left: 50px; width: 40px; height: 40px; opacity: 0.6;">
                <div style="font-size: 30px;">✨</div>
              </div>
              <div style="position: absolute; top: 50px; right: 60px; width: 40px; height: 40px; opacity: 0.6;">
                <div style="font-size: 25px;">✨</div>
              </div>
              <div style="position: absolute; bottom: 40px; left: 70px; width: 40px; height: 40px; opacity: 0.6;">
                <div style="font-size: 35px;">✨</div>
              </div>
              <div style="position: absolute; bottom: 60px; right: 50px; width: 40px; height: 40px; opacity: 0.6;">
                <div style="font-size: 28px;">✨</div>
              </div>
              
              <!-- Gift Box Icon -->
              <div style="margin: 0 auto 30px auto; width: 140px; height: 140px; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 15px 40px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 215, 0, 0.2); position: relative; transform: rotate(-5deg);">
                
                <!-- Ribbon Vertical -->
                <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 25px; height: 100%; background: linear-gradient(to right, #c9a500 0%, #e6c200 100%);"></div>
                
                <!-- Ribbon Horizontal -->
                <div style="position: absolute; top: 50%; left: 0; transform: translateY(-50%); width: 100%; height: 25px; background: linear-gradient(to bottom, #c9a500 0%, #e6c200 100%);"></div>
                
                <!-- Bow -->
                <div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); font-size: 50px; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.2));">
                  🎀
                </div>
                
                <!-- Gift Icon -->
                <div style="font-size: 60px; position: relative; z-index: 1; filter: drop-shadow(0 5px 15px rgba(0,0,0,0.15));">
                  🎁
                </div>
                
              </div>
              
              <!-- Header Text with Gradient -->
              <h1 style="margin: 0; font-size: 52px; font-weight: 900; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffa500 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-transform: uppercase; letter-spacing: 3px; line-height: 1.2;">
                🎁<br>REWARD<br>UNLOCKED!
              </h1>
              
            </td>
          </tr>
          
          <!-- Reward Details Section -->
          <tr>
            <td style="padding: 50px 40px;">
              
              <!-- Reward Box -->
              <div style="background: linear-gradient(135deg, #fffef7 0%, #fff9e6 100%); border-radius: 16px; padding: 40px; border: 2px solid #ffd700; box-shadow: 0 10px 30px rgba(255, 215, 0, 0.15);">
                
                <!-- Reward Name -->
                <h2 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #2d2d2d; text-align: center; line-height: 1.3;">
                  ${rewardName}
                </h2>
                
                <!-- Divider -->
                <div style="height: 2px; background: linear-gradient(to right, transparent 0%, #ffd700 50%, transparent 100%); margin: 25px 0;"></div>
                
                <!-- Reward Description -->
                <p style="margin: 0 0 25px 0; font-size: 16px; color: #555555; text-align: center; line-height: 1.7;">
                  ${rewardDescription}
                </p>
                
                <!-- Reward Features -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px;">
                  <tr>
                    <td style="padding: 15px; text-align: center;">
                      <div style="font-size: 30px; margin-bottom: 10px;">🏆</div>
                      <p style="margin: 0; font-size: 14px; color: #777777; font-weight: 600;">
                        Exclusive<br>Access
                      </p>
                    </td>
                    <td style="padding: 15px; text-align: center;">
                      <div style="font-size: 30px; margin-bottom: 10px;">⭐</div>
                      <p style="margin: 0; font-size: 14px; color: #777777; font-weight: 600;">
                        Premium<br>Benefit
                      </p>
                    </td>
                    <td style="padding: 15px; text-align: center;">
                      <div style="font-size: 30px; margin-bottom: 10px;">💎</div>
                      <p style="margin: 0; font-size: 14px; color: #777777; font-weight: 600;">
                        Limited<br>Edition
                      </p>
                    </td>
                  </tr>
                </table>
                
              </div>
              
              <!-- Expiry Notice -->
              <div style="margin-top: 30px; text-align: center; padding: 20px; background: rgba(255, 215, 0, 0.1); border-radius: 12px; border: 1px dashed #ffd700;">
                <p style="margin: 0; font-size: 14px; color: #c9a500; font-weight: 600;">
                  ⏰ Claim before <strong>${expiryDate}</strong>
                </p>
              </div>
              
            </td>
          </tr>
          
          <!-- Message & CTA Section -->
          <tr>
            <td style="padding: 0 40px 50px 40px; text-align: center;">
              
              <!-- Message -->
              <p style="margin: 0 0 35px 0; font-size: 18px; color: #555555; line-height: 1.6;">
                You've earned this reward for participating in <strong style="color: #c9a500;">CoverGirl</strong>.<br>
                Tap below to claim it before the expiration date.
              </p>
              
              <!-- CTA Button with Shimmer -->
              <div style="position: relative; display: inline-block;">
                
                <!-- Shimmer Background Layer -->
                <div style="position: absolute; top: -5px; left: -5px; right: -5px; bottom: -5px; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%); background-size: 200% 200%; border-radius: 55px; opacity: 0.6; filter: blur(8px);"></div>
                
                <!-- Button -->
                <a href="${claimUrl}" style="position: relative; display: inline-block; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); color: #2d2d2d; font-size: 18px; font-weight: 700; text-decoration: none; padding: 18px 50px; border-radius: 50px; box-shadow: 0 10px 30px rgba(255, 215, 0, 0.4); transition: transform 0.2s; text-transform: uppercase; letter-spacing: 1px; border: 2px solid #c9a500;">
                  Claim Reward
                </a>
                
              </div>
              
            </td>
          </tr>
          
          <!-- Footer Section -->
          <tr>
            <td style="background: linear-gradient(to bottom, #ffffff 0%, #fffef7 100%); padding: 30px 40px; text-align: center; border-top: 1px solid #ffe4a0;">
              
              <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.5;">
                © 2025 CoverGirl Contest. All rights reserved.<br>
                This reward is non-transferable and must be claimed by the registered user.
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

export default generateRewardDeliveryHTML;

