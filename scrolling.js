// these colors are randomly assigned to a user if they don't have a chat color,
// and are used by by the test messages
// dark colors are automatically lightened
const FALLBACK_USER_COLORS = [
  '#FFFFFF', // white
  '#FFC6FF', // light pink
  '#FFADAD', // light red
  '#FFD6A5', // light orange
  '#FDFFB6', // light yellow
  '#CAFFBF', // light green
  '#9BF6FF', // light cyan
  '#A0C4FF', // light blue
  '#BDB2FF', // light purple
  '#830044', // dark pink
  '#6E0000', // dark red
  '#854A02', // dark orange
  '#987200', // dark yellow
  '#115D00', // dark green
  '#006974', // dark cyan
  '#002560', // dark blue
  '#3C0067', // dark purple
  '#000000', // black
]

let messages = []
const userData = {}

// lower this if the message scrolling lags
const maxMessages = 30

// speed in pixels per second
const scrollingSpeed = 100

/****************
 * Chat Handler *
 ****************/

var slime2Chat = {
  // gives you the data of a chat message and the function to delete it
  onMessage: ({ message, deleteMessage }) => {
    // extract the necessary data from the message
    const { parts, user } = message

    // clone the main message template to insert the message data into
    // the templates are all defined in the HTML file
    const messageClone = cloneTemplate('message-template')

    // create the elements for the user and message content within the clone
    // this uses the element builder functions defined below
    messageClone.find('.user').append(buildUser(user))
    messageClone.find('.content').append(buildContent(parts))

    let userColor = getUserColor(user)
    const userColorBrightness = textBrightness(userColor)

    // add user's name color and add class to determine name color brightness
    messageClone
      .find('.message')
      .css('--userColor', userColor)
      .addClass(userColorBrightness === 'dark' ? 'user-dark' : 'user-light')

    // set position
    const position = `${random(0, 50)}%`
    messageClone
      .find('.message')
      .css(randomInteger(0, 1) ? { top: position } : { bottom: position })

    // defines what happens after the message has been fully rendered
    // can be used to delete messages over time, get message dimensions, etc.
    function callback(messageElement) {
      /*******************
       * Scroll Handling *
       *******************/
      const messageWidth = $(messageElement).outerWidth(true)
      const windowWidth = $(window).width()
      const extraScrollDistance = 150
      const scrollAmount = windowWidth + messageWidth + extraScrollDistance
      const scrollTime = (scrollAmount / scrollingSpeed) * 1000

      $(messageElement)
        .css({
          '--duration': `${scrollTime}ms`,
          '--start': `${windowWidth}px`,
          '--end': `${(messageWidth + extraScrollDistance) * -1}px`,
        })
        .addClass('animate')

      setTimeout(() => {
        $(messageElement).addClass('hide')
      }, scrollTime)

      /*******************
       * Delete Handling *
       *******************/

      // keeping track of messages
      messages.push({ ...message, delete: deleteMessage })

      // when there's over X messages, delete the oldest one
      // it'll lag if there's too many on screen
      if (messages.length > maxMessages) {
        const oldestMessage = messages.shift()
        oldestMessage.delete()
      }
    }

    // uncomment below to only show messages that contain emotes or cheers
    // if (!parts.find(part => part.type === 'emote' || part.type === 'cheer')) {
    //   return
    // }

    // return the message and the callback,
    // which renders the messages and runs the callback function
    return [messageClone, callback]
  },

  // handles when a message or messages have been deleted by a mod
  onModDelete: ({ type, id }) => {
    switch (type) {
      case 'all': {
        messages = []
        break
      }

      case 'user': {
        messages = messages.filter(message => message.user.id !== id)
        break
      }

      case 'single': {
        messages = messages.filter(message => message.id !== id)
        break
      }
    }
  },
}

/********************
 * Element Builders *
 ********************/

// insert in the user data
function buildUser(user) {
  const { displayName, userName, badges, pronouns } = user

  const userClone = cloneTemplate('user-template')
  userClone.find('.badges').append(buildBadges(badges))

  let name = displayName

  // handle localized display names
  // https://blog.twitch.tv/en/2016/08/22/localized-display-names-e00ee8d3250a/
  if (displayName.toLowerCase() !== userName.toLowerCase()) {
    name = `${displayName} (${userName})`
  }

  // insert in the user's pronouns and display name
  userClone.find('.pronouns').text(pronouns)
  userClone.find('.name').text(name)

  return userClone
}

// go through every message part, inserting in the emote, cheer, or text data
function buildContent(parts) {
  return parts.map(part => {
    switch (part.type) {
      case 'emote':
        return buildEmote(part)

      case 'cheer':
        return buildCheer(part)

      case 'text':
      default:
        return buildText(part)
    }
  })
}

// insert in the badge images
function buildBadges(badges) {
  return badges.map(badge => {
    const { image } = badge

    const badgeClone = cloneTemplate('badge-template')
    badgeClone.find('.badge').attr('src', image)

    return badgeClone
  })
}

// insert in the emote image
function buildEmote(part) {
  const { images } = part.emote

  const emoteClone = cloneTemplate('content-emote-template')
  emoteClone.find('.emote').attr('src', images.default.x4)

  return emoteClone
}

// insert in the cheermote image and cheer amount
function buildCheer(part) {
  const { amount, color, images } = part.cheer

  const cheerClone = cloneTemplate('content-cheer-template')
  cheerClone.find('.emote').attr('src', images.default.x4)
  cheerClone
    .find('.cheer-amount')
    .text(amount)
    .css('color', getLightColor(color))

  return cheerClone
}

// insert in the text
function buildText(part) {
  const { text } = part

  const textClone = cloneTemplate('content-text-template')
  textClone.find('.text').text(text)

  return textClone
}

/*******************
 * Color Functions *
 *******************/

// gets the user's name color, if they chose a color
// if they never chose one, assign a random color from DEFAULT_USER_COLORS
function getUserColor(user) {
  const { userName } = user

  // get the stored user data from this session
  let storedUserData = userData[userName]

  // if this was the first chat from the user during this session, they
  // don't have any stored data, so create new stored data for them
  if (!storedUserData) {
    // if user.color exists, use that
    // otherwise get a random color from DEFAULT_USER_COLORS

    let color = user.color
    if (!color) {
      color =
        FALLBACK_USER_COLORS[randomInteger(0, FALLBACK_USER_COLORS.length - 1)]
    }

    storedUserData = {
      color: getLightColor(color),
    }

    // store the user data so that the user will always have the same color
    // userData[userName] = storedUserData
  }

  return storedUserData.color
}

function getLightColor(color) {
  if (textBrightness(color) === 'light') return color

  return Color.mix(color, 'white', 0.75, {
    space: 'hsv',
    outputSpace: 'srgb',
  }).toString({
    format: 'hex',
  })
}

// returns either 'light' or 'dark'
// 'light' if the given text color has better readability on a black background
// 'dark' if the given text color has better readability on a white background
// https://colorjs.io/docs/contrast#accessible-perceptual-contrast-algorithm-apca
function textBrightness(color) {
  const textColor = new Color(color)
  const blackBackground = new Color('#000000')
  const whiteBackground = new Color('#FFFFFF')

  const darkContrast = Math.abs(blackBackground.contrastAPCA(textColor))
  const lightContrast = Math.abs(whiteBackground.contrastAPCA(textColor))

  return darkContrast > lightContrast ? 'light' : 'dark'
}

// returns either 'light' or 'dark'
// 'light' if black text has better readability on the given background color
// 'dark' if white text has better readability on the given background color
// https://colorjs.io/docs/contrast#accessible-perceptual-contrast-algorithm-apca
function backgroundBrightness(color) {
  const backgroundColor = new Color(color)
  const blackText = new Color('#000000')
  const whiteText = new Color('#FFFFFF')

  const darkContrast = Math.abs(backgroundColor.contrastAPCA(whiteText))
  const lightContrast = Math.abs(backgroundColor.contrastAPCA(blackText))

  return darkContrast > lightContrast ? 'dark' : 'light'
}

/********************
 * Helper Functions *
 ********************/

// given an ID, clone the template and wrap it with jQuery
function cloneTemplate(id) {
  return $(document.getElementById(id).content.cloneNode(true))
}

// generate a random integer between min (included) and max (included)
function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// generate a random number between min (included) and max (excluded)
function random(min, max) {
  return Math.random() * (max - min) + min
}
