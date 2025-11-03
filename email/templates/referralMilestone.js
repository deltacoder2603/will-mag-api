/**
 * Referral Milestone Email Template
 * Theme: Deep blue + gold glow with progress tracker bar
 * Message: "Level Unlocked"
 */

/**
 * Generate Referral Milestone email HTML
 * 
 * @param {Object} data - Template data
 * @param {string} data.userName - Name of the user
 * @param {number} data.referralCount - Number of successful referrals
 * @param {string} data.tierName - Achievement tier reached
 * @param {string} data.rewardName - Reward earned
 * @param {string} data.claimUrl - URL to claim the reward
 * @param {number} data.nextTierCount - Referrals needed for next tier
 * @returns {string} HTML email content
 */
export function generateReferralMilestoneHTML(data) {
  const { 
    userName = 'Champion',
    referralCount = 0,
    tierName = 'Bronze',
    rewardName = 'Exclusive Reward',
    claimUrl = '#',
    nextTierCount = null
  } = data;
  
  const tierColors = {
    'Bronze': '#cd7f32',
    'Silver': '#c0c0c0',
    'Gold': '#ffd700',
    'Platinum': '#e5e4e2',
    'Diamond': '#b9f2ff'
  };
  
  const tierColor = tierColors[tierName] || '#ffd700';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milestone Achieved</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #0a1128 0%, #1e3a5f 100%); min-height: 100vh;">
  
  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Email Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background: linear-gradient(180deg, #1a2a4e 0%, #0f1729 100%); border-radius: 24px; box-shadow: 0 20px 60px rgba(255, 215, 0, 0.3); overflow: hidden; border: 2px solid ${tierColor};">
          
          <!-- Hero Section -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #0a1128 100%); padding: 60px 40px; text-align: center; position: relative; overflow: hidden;">
              
              <!-- Radial Glow Effects -->
              <div style="position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 300px; height: 300px; background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%); opacity: 0.8; border-radius: 50%;"></div>
              
              <!-- Trophy with Glow -->
              <div style="position: relative; display: inline-block; margin-bottom: 30px;">
                
                <!-- Glow Ring -->
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 180px; height: 180px; background: radial-gradient(circle, ${tierColor}40 0%, transparent 70%); border-radius: 50%; animation: pulse 2s infinite;"></div>
                
                <!-- Trophy Icon -->
                <div style="position: relative; font-size: 100px; filter: drop-shadow(0 10px 30px ${tierColor});">
                  🏆
                </div>
                
              </div>
              
              <!-- Achievement Badge -->
              <div style="margin: 0 auto 25px auto; display: inline-block; background: linear-gradient(135deg, ${tierColor} 0%, ${tierColor}cc 100%); padding: 12px 30px; border-radius: 50px; box-shadow: 0 8px 20px ${tierColor}60;">
                <p style="margin: 0; font-size: 16px; font-weight: 700; color: #000000; text-transform: uppercase; letter-spacing: 2px;">
                  ${tierName} Tier Unlocked
                </p>
              </div>
              
              <!-- Header Text -->
              <h1 style="margin: 0; font-size: 42px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 30px ${tierColor};">
                ✨ You Did It!
              </h1>
              
              <p style="margin: 20px 0 0 0; font-size: 18px; color: #cccccc; font-weight: 500;">
                Congratulations, ${userName}!
              </p>
              
            </td>
          </tr>
          
          <!-- Achievement Details Section -->
          <tr>
            <td style="padding: 50px 40px;">
              
              <!-- Achievement Box -->
              <div style="background: rgba(255, 215, 0, 0.05); border-radius: 16px; padding: 40px; border: 2px solid rgba(255, 215, 0, 0.2);">
                
                <!-- Achievement Text -->
                <p style="margin: 0 0 30px 0; font-size: 20px; color: #ffffff; text-align: center; line-height: 1.7;">
                  You referred <strong style="color: ${tierColor}; font-size: 32px;">${referralCount}</strong> new voters<br>
                  and hit <strong style="color: ${tierColor};">${tierName}</strong> level!
                </p>
                
                <!-- Progress Tracker Bar -->
                <div style="margin: 40px 0;">
                  
                  <p style="margin: 0 0 15px 0; font-size: 12px; color: #999999; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                    Referral Progress
                  </p>
                  
                  <!-- Progress Bar Container -->
                  <div style="width: 100%; height: 40px; background: rgba(255, 255, 255, 0.1); border-radius: 20px; position: relative; overflow: hidden; border: 1px solid rgba(255, 215, 0, 0.3);">
                    
                    <!-- Progress Fill -->
                    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${nextTierCount ? Math.min((referralCount / nextTierCount) * 100, 100) : 100}%; background: linear-gradient(to right, ${tierColor} 0%, ${tierColor}cc 100%); border-radius: 20px; box-shadow: 0 0 20px ${tierColor}80;"></div>
                    
                    <!-- Count Display -->
                    <div style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center;">
                      <p style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        ${referralCount} ${nextTierCount ? `/ ${nextTierCount}` : 'Complete!'}
                      </p>
                    </div>
                    
                  </div>
                  
                  ${nextTierCount ? `
                    <p style="margin: 15px 0 0 0; font-size: 13px; color: #888888; text-align: center;">
                      ${nextTierCount - referralCount} more referrals to unlock the next tier
                    </p>
                  ` : `
                    <p style="margin: 15px 0 0 0; font-size: 13px; color: #00ff88; text-align: center; font-weight: 600;">
                      🎉 Maximum tier achieved!
                    </p>
                  `}
                  
                </div>
                
                <!-- Reward Display -->
                <div style="margin-top: 40px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%); border-radius: 12px; padding: 30px; border: 1px solid ${tierColor};">
                  
                  <div style="text-align: center; margin-bottom: 20px; font-size: 50px;">
                    🎁
                  </div>
                  
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #999999; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                    Your Reward
                  </p>
                  
                  <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${tierColor}; text-align: center; text-shadow: 0 0 15px ${tierColor}60;">
                    ${rewardName}
                  </p>
                  
                </div>
                
              </div>
              
            </td>
          </tr>
          
          <!-- Stats Grid -->
          <tr>
            <td style="padding: 0 40px 50px 40px;">
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="width: 33.33%; padding: 0 5px;">
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.1);">
                      <div style="font-size: 30px; margin-bottom: 10px;">👥</div>
                      <p style="margin: 0 0 5px 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                        ${referralCount}
                      </p>
                      <p style="margin: 0; font-size: 11px; color: #888888; text-transform: uppercase;">
                        Referrals
                      </p>
                    </div>
                  </td>
                  <td style="width: 33.33%; padding: 0 5px;">
                    <div style="background: rgba(255, 215, 0, 0.1); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid ${tierColor};">
                      <div style="font-size: 30px; margin-bottom: 10px;">⭐</div>
                      <p style="margin: 0 0 5px 0; font-size: 20px; font-weight: 700; color: ${tierColor};">
                        ${tierName}
                      </p>
                      <p style="margin: 0; font-size: 11px; color: #888888; text-transform: uppercase;">
                        Tier
                      </p>
                    </div>
                  </td>
                  <td style="width: 33.33%; padding: 0 5px;">
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.1);">
                      <div style="font-size: 30px; margin-bottom: 10px;">🎯</div>
                      <p style="margin: 0 0 5px 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                        ${nextTierCount ? nextTierCount - referralCount : '✓'}
                      </p>
                      <p style="margin: 0; font-size: 11px; color: #888888; text-transform: uppercase;">
                        To Next
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- CTA Section -->
          <tr>
            <td style="padding: 0 40px 50px 40px; text-align: center;">
              
              <!-- Message -->
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #cccccc; line-height: 1.6;">
                Your ${tierName} tier reward is ready to claim!<br>
                Tap below to redeem it now.
              </p>
              
              <!-- CTA Button -->
              <a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, ${tierColor} 0%, ${tierColor}cc 100%); color: ${tierName === 'Gold' || tierName === 'Bronze' ? '#000000' : '#ffffff'}; font-size: 18px; font-weight: 700; text-decoration: none; padding: 18px 50px; border-radius: 50px; box-shadow: 0 10px 30px ${tierColor}60, 0 0 40px ${tierColor}40; transition: transform 0.2s; text-transform: uppercase; letter-spacing: 1px;">
                Redeem Reward
              </a>
              
            </td>
          </tr>
          
          <!-- Footer Section -->
          <tr>
            <td style="background: #000000; padding: 30px 40px; text-align: center; border-top: 1px solid rgba(255, 215, 0, 0.2);">
              
              <p style="margin: 0; font-size: 12px; color: #555555; line-height: 1.5;">
                © 2025 CoverGirl Contest. All rights reserved.<br>
                Keep referring to unlock even more exclusive rewards!
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

export default generateReferralMilestoneHTML;

