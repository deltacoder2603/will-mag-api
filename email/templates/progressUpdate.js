/**
 * Progress Update Email Template
 * Theme: Electric purple + black gradient with progress bar animation
 * Message: "She's Getting Closer"
 */

/**
 * Generate Progress Update email HTML
 * 
 * @param {Object} data - Template data
 * @param {string} data.modelName - Name of the model
 * @param {number} data.voteCount - Current vote count
 * @param {number} data.votesNeeded - Votes needed to reach next milestone
 * @param {number} data.daysLeft - Days remaining in contest
 * @param {number} data.progressPercent - Progress percentage (0-100)
 * @param {string} data.profileUrl - URL to boost/vote
 * @returns {string} HTML email content
 */
export function generateProgressUpdateHTML(data) {
  const { 
    modelName, 
    voteCount = 0, 
    votesNeeded = 100, 
    daysLeft = 7,
    progressPercent = 50,
    profileUrl = '#'
  } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Progress Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #1a0033 0%, #2d004d 100%); min-height: 100vh;">
  
  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Email Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 24px; box-shadow: 0 20px 60px rgba(138, 43, 226, 0.4); overflow: hidden; border: 1px solid #3d1a5c;">
          
          <!-- Hero Section -->
          <tr>
            <td style="background: linear-gradient(135deg, #8a2be2 0%, #6a0dad 100%); padding: 50px 40px; text-align: center; position: relative;">
              
              <!-- Glow Effect -->
              <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(138, 43, 226, 0.6) 0%, transparent 70%); opacity: 0.8; border-radius: 50%;"></div>
              
              <!-- Fire Emoji with Glow -->
              <div style="font-size: 60px; margin-bottom: 20px; text-shadow: 0 0 30px rgba(255, 69, 0, 0.8);">
                🔥
              </div>
              
              <!-- Header Text -->
              <h1 style="margin: 0; font-size: 36px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                ${modelName} is heating up!
              </h1>
              
            </td>
          </tr>
          
          <!-- Progress Bar Section -->
          <tr>
            <td style="padding: 50px 40px;">
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <!-- Progress Bar Column -->
                  <td style="width: 20px; vertical-align: top; padding-right: 30px;">
                    
                    <!-- Vertical Progress Bar Container -->
                    <div style="width: 20px; height: 300px; background: rgba(138, 43, 226, 0.2); border-radius: 10px; position: relative; overflow: hidden; border: 2px solid #3d1a5c;">
                      
                      <!-- Progress Fill -->
                      <div style="position: absolute; bottom: 0; left: 0; right: 0; height: ${progressPercent}%; background: linear-gradient(to top, #8a2be2 0%, #da70d6 100%); border-radius: 8px; box-shadow: 0 0 20px rgba(138, 43, 226, 0.8);"></div>
                      
                    </div>
                    
                  </td>
                  
                  <!-- Content Column -->
                  <td style="vertical-align: middle;">
                    
                    <!-- Stats Container -->
                    <div style="background: rgba(138, 43, 226, 0.1); border-radius: 16px; padding: 30px; border: 1px solid #3d1a5c;">
                      
                      <!-- Vote Count Stat -->
                      <div style="margin-bottom: 30px;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #b8b8b8; text-transform: uppercase; letter-spacing: 1px;">
                          Current Votes
                        </p>
                        <p style="margin: 0; font-size: 48px; font-weight: 800; color: #8a2be2; text-shadow: 0 0 20px rgba(138, 43, 226, 0.6);">
                          ${voteCount.toLocaleString()}
                        </p>
                      </div>
                      
                      <!-- Votes Needed Stat -->
                      <div style="margin-bottom: 30px;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #b8b8b8; text-transform: uppercase; letter-spacing: 1px;">
                          Votes to Top 10
                        </p>
                        <p style="margin: 0; font-size: 32px; font-weight: 700; color: #da70d6;">
                          ${votesNeeded.toLocaleString()} away
                        </p>
                      </div>
                      
                      <!-- Days Left Stat -->
                      <div style="margin-bottom: 0;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #b8b8b8; text-transform: uppercase; letter-spacing: 1px;">
                          Time Remaining
                        </p>
                        <p style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
                          ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}
                        </p>
                      </div>
                      
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
              <p style="margin: 0 0 30px 0; font-size: 18px; color: #cccccc; line-height: 1.6;">
                She's <strong style="color: #8a2be2;">so close</strong> to breaking into the Top 10.<br>
                Your support could make all the difference!
              </p>
              
              <!-- CTA Button -->
              <a href="${profileUrl}" style="display: inline-block; background: linear-gradient(135deg, #8a2be2 0%, #6a0dad 100%); color: #ffffff; font-size: 18px; font-weight: 700; text-decoration: none; padding: 18px 50px; border-radius: 50px; box-shadow: 0 10px 30px rgba(138, 43, 226, 0.5), 0 0 40px rgba(138, 43, 226, 0.3); transition: transform 0.2s; text-transform: uppercase; letter-spacing: 1px; border: 2px solid #a855f7;">
                Boost Her Now
              </a>
              
            </td>
          </tr>
          
          <!-- Footer Section -->
          <tr>
            <td style="background: #000000; padding: 30px 40px; text-align: center; border-top: 1px solid #3d1a5c;">
              
              <p style="margin: 0; font-size: 12px; color: #666666; line-height: 1.5;">
                © 2025 CoverGirl Contest. All rights reserved.<br>
                You're receiving progress updates for ${modelName}.
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

export default generateProgressUpdateHTML;

