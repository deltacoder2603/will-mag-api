/**
 * Email Scheduling Logic
 * 
 * This module provides intelligent email scheduling that ensures emails
 * are sent at optimal times based on a predefined weekly schedule.
 * 
 * Schedule:
 * - Monday: 09:45 AM, 03:00 PM
 * - Tuesday: 10:00 AM, 04:00 PM
 * - Wednesday: 10:00 AM, 03:30 PM
 * - Thursday: 09:30 AM, 04:30 PM
 * - Friday: 09:15 AM, 02:30 PM
 */

/**
 * Weekly schedule configuration
 * Day index: 0 = Sunday, 1 = Monday, etc.
 */
const SCHEDULE = {
  1: [ // Monday
    { hour: 9, minute: 45 },
    { hour: 15, minute: 0 }
  ],
  2: [ // Tuesday
    { hour: 10, minute: 0 },
    { hour: 16, minute: 0 }
  ],
  3: [ // Wednesday
    { hour: 10, minute: 0 },
    { hour: 15, minute: 30 }
  ],
  4: [ // Thursday
    { hour: 9, minute: 30 },
    { hour: 16, minute: 30 }
  ],
  5: [ // Friday
    { hour: 9, minute: 15 },
    { hour: 14, minute: 30 }
  ]
};

/**
 * Get the next best send time based on current date/time
 * 
 * @returns {Date} Next scheduled send time
 */
export function getNextBestSendTime() {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Convert current time to minutes for easier comparison
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  // Check if there's a slot available today
  if (SCHEDULE[currentDay]) {
    for (const slot of SCHEDULE[currentDay]) {
      const slotTimeInMinutes = slot.hour * 60 + slot.minute;
      
      // If slot is still in the future today, use it
      if (slotTimeInMinutes > currentTimeInMinutes) {
        const nextTime = new Date(now);
        nextTime.setHours(slot.hour, slot.minute, 0, 0);
        return nextTime;
      }
    }
  }
  
  // No slot available today, find next available day
  let daysToAdd = 1;
  let nextDay = (currentDay + daysToAdd) % 7;
  
  // Keep checking until we find a scheduled day
  while (!SCHEDULE[nextDay] && daysToAdd <= 7) {
    daysToAdd++;
    nextDay = (currentDay + daysToAdd) % 7;
  }
  
  // If we've checked all days and found none, default to Monday morning
  if (daysToAdd > 7) {
    daysToAdd = (8 - currentDay) % 7; // Days until next Monday
    if (daysToAdd === 0) daysToAdd = 7;
    nextDay = 1; // Monday
  }
  
  // Get the first slot of the next available day
  const firstSlot = SCHEDULE[nextDay][0];
  const nextTime = new Date(now);
  nextTime.setDate(now.getDate() + daysToAdd);
  nextTime.setHours(firstSlot.hour, firstSlot.minute, 0, 0);
  
  return nextTime;
}

/**
 * Calculate delay in milliseconds until the next best send time
 * 
 * @returns {number} Delay in milliseconds
 */
export function getDelayUntilNextSend() {
  const now = new Date();
  const nextSendTime = getNextBestSendTime();
  return nextSendTime.getTime() - now.getTime();
}

/**
 * Schedule an email to be sent at the next optimal time
 * 
 * @param {Function} sendFunction - The email sending function to execute
 * @param {string} to - Recipient email address
 * @param {Object} data - Email template data
 * @returns {Promise} Resolves when email is sent
 */
export function scheduleEmail(sendFunction, to, data) {
  return new Promise((resolve, reject) => {
    const delay = getDelayUntilNextSend();
    const nextSendTime = getNextBestSendTime();
    
    console.log(`Email scheduled to be sent at: ${nextSendTime.toLocaleString()}`);
    console.log(`Delay: ${Math.round(delay / 1000 / 60)} minutes`);
    
    // Schedule the email
    setTimeout(async () => {
      try {
        const result = await sendFunction(to, data);
        console.log(`Email sent successfully at: ${new Date().toLocaleString()}`);
        resolve(result);
      } catch (error) {
        console.error('Failed to send scheduled email:', error);
        reject(error);
      }
    }, delay);
  });
}

/**
 * Send email immediately without scheduling
 * (useful for testing or urgent notifications)
 * 
 * @param {Function} sendFunction - The email sending function to execute
 * @param {string} to - Recipient email address
 * @param {Object} data - Email template data
 * @returns {Promise} Result of the send function
 */
export async function sendImmediately(sendFunction, to, data) {
  console.log(`Sending email immediately at: ${new Date().toLocaleString()}`);
  return await sendFunction(to, data);
}

