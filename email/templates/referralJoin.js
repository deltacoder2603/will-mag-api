/**
 * Referral Join Email Template
 * Theme: Coral or teal gradient with animated arrows showing flow
 * Message: "Share the Spotlight"
 */

/**
 * Generate Referral Join email HTML
 * 
 * @param {Object} data - Template data
 * @param {string} data.userName - Name of the user
 * @param {string} data.referralLink - Unique referral link
 * @param {string} data.rewardName - Reward for successful referrals
 * @param {number} data.referralsNeeded - Number of referrals needed for reward
 * @returns {string} HTML email content
 */
export function generateReferralJoinHTML(data) {
  const { 
    userName = 'Friend',
    referralLink = '#',
    rewardName = 'Exclusive Rewards',
    referralsNeeded = 5
  } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share the Spotlight</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #fff0f5 0%, #e0f7f7 100%); min-height: 100vh;">
  
  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Email Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background: #ffffff; border-radius: 24px; box-shadow: 0 20px 60px rgba(102, 205, 170, 0.25); overflow: hidden; border: 3px solid #66cdaa;">
          
          <!-- Hero Section -->
          <tr>
            <td style="background: linear-gradient(135deg, #ff7f50 0%, #66cdaa 100%); padding: 60px 40px; text-align: center; position: relative; overflow: hidden;">
              
              <!-- Gradient Orbs -->
              <div style="position: absolute; top: -80px; left: -80px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(255, 127, 80, 0.4) 0%, transparent 70%); border-radius: 50%;"></div>
              <div style="position: absolute; bottom: -60px; right: -60px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(102, 205, 170, 0.4) 0%, transparent 70%); border-radius: 50%;"></div>
              
              <!-- Selfie Emoji -->
              <div style="font-size: 70px; margin-bottom: 25px; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.15));">
                🤳
              </div>
              
              <!-- Header Text -->
              <h1 style="margin: 0; font-size: 42px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                🌸 Invite. Earn. Repeat.
              </h1>
              
              <p style="margin: 20px 0 0 0; font-size: 18px; color: #ffffff; font-weight: 500; opacity: 0.95;">
                Hey ${userName}, share the spotlight with your friends!
              </p>
              
            </td>
          </tr>
          
          <!-- Referral Steps Section -->
          <tr>
            <td style="padding: 50px 40px;">
              
              <!-- Section Title -->
              <h2 style="margin: 0 0 40px 0; font-size: 24px; font-weight: 700; color: #2d2d2d; text-align: center;">
                How It Works
              </h2>
              
              <!-- Steps Container -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                
                <!-- Step 1: Invite -->
                <tr>
                  <td style="padding-bottom: 30px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 80px; vertical-align: top; text-align: center;">
                          
                          <!-- Icon Circle -->
                          <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #ff7f50 0%, #ff6347 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(255, 127, 80, 0.3);">
                            <span style="font-size: 35px;">📧</span>
                          </div>
                          
                          <!-- Arrow Down -->
                          <div style="margin-top: 15px; font-size: 30px; color: #66cdaa; line-height: 1;">
                            ↓
                          </div>
                          
                        </td>
                        <td style="vertical-align: top; padding-left: 20px;">
                          
                          <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #ff7f50;">
                            1. Invite Friends
                          </h3>
                          <p style="margin: 0; font-size: 15px; color: #666666; line-height: 1.6;">
                            Share your unique referral link with friends who love beauty and competition.
                          </p>
                          
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Step 2: Join -->
                <tr>
                  <td style="padding-bottom: 30px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 80px; vertical-align: top; text-align: center;">
                          
                          <!-- Icon Circle -->
                          <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #66cdaa 0%, #48d1a0 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(102, 205, 170, 0.3);">
                            <span style="font-size: 35px;">✅</span>
                          </div>
                          
                          <!-- Arrow Down -->
                          <div style="margin-top: 15px; font-size: 30px; color: #ff7f50; line-height: 1;">
                            ↓
                          </div>
                          
                        </td>
                        <td style="vertical-align: top; padding-left: 20px;">
                          
                          <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #66cdaa;">
                            2. They Join
                          </h3>
                          <p style="margin: 0; font-size: 15px; color: #666666; line-height: 1.6;">
                            When they sign up using your link, both of you get special perks!
                          </p>
                          
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Step 3: Earn -->
                <tr>
                  <td>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 80px; vertical-align: top; text-align: center;">
                          
                          <!-- Icon Circle -->
                          <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3);">
                            <span style="font-size: 35px;">🎁</span>
                          </div>
                          
                        </td>
                        <td style="vertical-align: top; padding-left: 20px;">
                          
                          <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #ffa500;">
                            3. Earn Rewards
                          </h3>
                          <p style="margin: 0; font-size: 15px; color: #666666; line-height: 1.6;">
                            Unlock <strong style="color: #ff7f50;">${rewardName}</strong> after ${referralsNeeded} successful referrals.
                          </p>
                          
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
              
              <!-- Reward Highlight Box -->
              <div style="margin-top: 40px; background: linear-gradient(135deg, rgba(255, 127, 80, 0.1) 0%, rgba(102, 205, 170, 0.1) 100%); border-radius: 16px; padding: 30px; border: 2px dashed #66cdaa;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #888888; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                  Your Potential Reward
                </p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: #ff7f50; text-align: center;">
                  ${rewardName}
                </p>
              </div>
              
            </td>
          </tr>
          
          <!-- Referral Link Section -->
          <tr>
            <td style="padding: 0 40px 50px 40px;">
              
              <!-- Message -->
              <p style="margin: 0 0 25px 0; font-size: 16px; color: #555555; text-align: center; line-height: 1.6;">
                Every friend who joins through your link brings you closer to<br>
                <strong style="color: #66cdaa;">${rewardName}</strong>
              </p>
              
              <!-- Referral Link Box -->
              <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #e0e0e0; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #999999; text-transform: uppercase; letter-spacing: 1px;">
                  Your Referral Link
                </p>
                <p style="margin: 0; font-size: 14px; color: #66cdaa; font-weight: 600; word-break: break-all;">
                  ${referralLink}
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center;">
                <a href="${referralLink}" style="display: inline-block; background: linear-gradient(135deg, #ff7f50 0%, #66cdaa 100%); color: #ffffff; font-size: 18px; font-weight: 700; text-decoration: none; padding: 18px 50px; border-radius: 50px; box-shadow: 0 10px 30px rgba(255, 127, 80, 0.4); transition: transform 0.2s; text-transform: uppercase; letter-spacing: 1px;">
                  Copy Referral Link
                </a>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer Section -->
          <tr>
            <td style="background: linear-gradient(to bottom, #ffffff 0%, #f9fffe 100%); padding: 30px 40px; text-align: center; border-top: 1px solid #e0f0e8;">
              
              <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.5;">
                © 2025 CoverGirl Contest. All rights reserved.<br>
                Referral rewards are subject to terms and conditions.
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

export default generateReferralJoinHTML;

