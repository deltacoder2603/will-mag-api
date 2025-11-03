/**
 * Rank Update Email Template
 * Theme: Bold black background with neon blue highlights and pulsing rank badge
 * Message: "The Leaderboard Just Shifted"
 */

/**
 * Generate Rank Update email HTML
 * 
 * @param {Object} data - Template data
 * @param {string} data.modelName - Name of the model
 * @param {number} data.rankPosition - Current rank position
 * @param {number} data.previousRank - Previous rank position
 * @param {number} data.voteCount - Current vote count
 * @param {string} data.profileUrl - URL to vote/share
 * @returns {string} HTML email content
 */
export function generateRankUpdateHTML(data) {
  const { 
    modelName, 
    rankPosition, 
    previousRank = rankPosition + 1,
    voteCount = 0,
    profileUrl = '#'
  } = data;
  
  const rankColor = rankPosition === 1 ? '#ffd700' : rankPosition <= 3 ? '#00d9ff' : '#00ff88';
  const isMovingUp = previousRank > rankPosition;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rank Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background: #000000; min-height: 100vh;">
  
  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Email Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background: linear-gradient(180deg, #0a0a0a 0%, #000000 100%); border-radius: 24px; box-shadow: 0 20px 60px rgba(0, 217, 255, 0.3); overflow: hidden; border: 2px solid #00d9ff;">
          
          <!-- Hero Section -->
          <tr>
            <td style="background: linear-gradient(135deg, #001a33 0%, #000d1a 100%); padding: 50px 40px; text-align: center; position: relative; overflow: hidden;">
              
              <!-- Animated Glow Effects -->
              <div style="position: absolute; top: -100px; left: -100px; width: 250px; height: 250px; background: radial-gradient(circle, rgba(0, 217, 255, 0.3) 0%, transparent 70%); opacity: 0.6; border-radius: 50%;"></div>
              <div style="position: absolute; bottom: -80px; right: -80px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(0, 255, 136, 0.2) 0%, transparent 70%); opacity: 0.6; border-radius: 50%;"></div>
              
              <!-- Rocket Emoji -->
              <div style="font-size: 60px; margin-bottom: 20px; filter: drop-shadow(0 0 20px rgba(0, 217, 255, 0.8));">
                🚀
              </div>
              
              <!-- Header Text -->
              <h1 style="margin: 0; font-size: 36px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 30px rgba(0, 217, 255, 0.8);">
                ${modelName} is now #${rankPosition}!
              </h1>
              
              ${isMovingUp ? `
                <p style="margin: 20px 0 0 0; font-size: 16px; color: #00ff88; font-weight: 600; letter-spacing: 1px;">
                  ↑ Moved up from #${previousRank}
                </p>
              ` : ''}
              
            </td>
          </tr>
          
          <!-- Leaderboard Section -->
          <tr>
            <td style="padding: 50px 40px;">
              
              <!-- Section Title -->
              <h2 style="margin: 0 0 30px 0; font-size: 20px; font-weight: 700; color: #00d9ff; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                Current Leaderboard
              </h2>
              
              <!-- Leaderboard Graphic -->
              <div style="background: rgba(0, 217, 255, 0.05); border-radius: 16px; padding: 30px; border: 1px solid rgba(0, 217, 255, 0.2);">
                
                <!-- Rank Positions -->
                ${generateLeaderboardPositions(rankPosition, modelName)}
                
              </div>
              
              <!-- Stats Row -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 40px;">
                <tr>
                  <td style="width: 50%; padding-right: 10px;">
                    <div style="background: rgba(0, 217, 255, 0.1); border-radius: 12px; padding: 25px; text-align: center; border: 1px solid rgba(0, 217, 255, 0.3);">
                      <p style="margin: 0 0 8px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px;">
                        Total Votes
                      </p>
                      <p style="margin: 0; font-size: 32px; font-weight: 800; color: #00d9ff; text-shadow: 0 0 15px rgba(0, 217, 255, 0.6);">
                        ${voteCount.toLocaleString()}
                      </p>
                    </div>
                  </td>
                  <td style="width: 50%; padding-left: 10px;">
                    <div style="background: rgba(0, 255, 136, 0.1); border-radius: 12px; padding: 25px; text-align: center; border: 1px solid rgba(0, 255, 136, 0.3);">
                      <p style="margin: 0 0 8px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px;">
                        Current Rank
                      </p>
                      <p style="margin: 0; font-size: 32px; font-weight: 800; color: ${rankColor}; text-shadow: 0 0 15px ${rankColor};">
                        #${rankPosition}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Message & CTA Section -->
          <tr>
            <td style="padding: 0 40px 50px 40px; text-align: center;">
              
              <!-- Message -->
              <p style="margin: 0 0 30px 0; font-size: 18px; color: #cccccc; line-height: 1.6;">
                ${rankPosition <= 3 ? 
                  `<strong style="color: #00d9ff;">Incredible!</strong> ${modelName} is in the top 3!<br>Help her reach #1 and claim the crown.` :
                  `Momentum's strong — one more push could take her to the top.`
                }
              </p>
              
              <!-- CTA Button -->
              <a href="${profileUrl}" style="display: inline-block; background: linear-gradient(135deg, #00d9ff 0%, #0099cc 100%); color: #000000; font-size: 18px; font-weight: 700; text-decoration: none; padding: 18px 50px; border-radius: 50px; box-shadow: 0 10px 30px rgba(0, 217, 255, 0.5), 0 0 40px rgba(0, 217, 255, 0.4); transition: transform 0.2s; text-transform: uppercase; letter-spacing: 1px;">
                Vote & Share Now
              </a>
              
            </td>
          </tr>
          
          <!-- Footer Section -->
          <tr>
            <td style="background: #000000; padding: 30px 40px; text-align: center; border-top: 1px solid rgba(0, 217, 255, 0.2);">
              
              <p style="margin: 0; font-size: 12px; color: #444444; line-height: 1.5;">
                © 2025 CoverGirl Contest. All rights reserved.<br>
                Leaderboard updates are sent when rankings change.
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

/**
 * Generate leaderboard positions HTML
 * Highlights the current model's position
 */
function generateLeaderboardPositions(currentRank, modelName) {
  const positions = [];
  const startRank = Math.max(1, currentRank - 2);
  const endRank = Math.min(10, currentRank + 2);
  
  for (let i = startRank; i <= endRank; i++) {
    const isCurrentModel = i === currentRank;
    const rankColor = i === 1 ? '#ffd700' : i <= 3 ? '#00d9ff' : '#00ff88';
    const bgColor = isCurrentModel ? 'rgba(0, 217, 255, 0.15)' : 'transparent';
    const borderColor = isCurrentModel ? 'rgba(0, 217, 255, 0.5)' : 'rgba(255, 255, 255, 0.05)';
    
    positions.push(`
      <div style="display: flex; align-items: center; padding: 20px; margin-bottom: 12px; background: ${bgColor}; border-radius: 12px; border: 2px solid ${borderColor}; ${isCurrentModel ? 'box-shadow: 0 0 30px rgba(0, 217, 255, 0.3);' : ''}">
        
        <!-- Rank Badge -->
        <div style="flex-shrink: 0; width: 60px; height: 60px; background: ${isCurrentModel ? `linear-gradient(135deg, ${rankColor} 0%, ${rankColor}99 100%)` : 'rgba(255, 255, 255, 0.1)'}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 20px; ${isCurrentModel ? `box-shadow: 0 0 25px ${rankColor};` : ''}">
          <span style="font-size: 24px; font-weight: 800; color: ${isCurrentModel ? '#000000' : '#ffffff'};">
            #${i}
          </span>
        </div>
        
        <!-- Model Name -->
        <div style="flex-grow: 1;">
          <p style="margin: 0; font-size: ${isCurrentModel ? '20px' : '16px'}; font-weight: ${isCurrentModel ? '700' : '500'}; color: ${isCurrentModel ? '#ffffff' : '#999999'};">
            ${isCurrentModel ? modelName : `Competitor ${i}`}
          </p>
        </div>
        
        ${isCurrentModel ? `
          <!-- Trophy Icon -->
          <div style="flex-shrink: 0; font-size: 30px; filter: drop-shadow(0 0 10px ${rankColor});">
            ${i === 1 ? '👑' : i <= 3 ? '🏆' : '⭐'}
          </div>
        ` : ''}
        
      </div>
    `);
  }
  
  return positions.join('');
}

export default generateRankUpdateHTML;

