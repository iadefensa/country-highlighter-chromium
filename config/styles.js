// Developer-configurable style constants
// User-facing highlight levels are in options, but styles are defined here
// This file is loaded as a regular script (not ES6 module) so content.js can access it

const HIGHLIGHT_STYLES = {
  subtle: {
    text: {
      textDecoration: 'underline',
      textDecorationColor: '#f59e0b',
      textDecorationThickness: '2px',
      textUnderlineOffset: '2px'
    },
    page: null
  },

  normal: {
    text: {
      backgroundColor: '#fef08a',
      color: '#000',
      padding: '2px 4px',
      borderRadius: '3px'
    },
    page: null
  },

  assertive: {
    text: {
      backgroundColor: '#fef08a',
      color: '#000',
      padding: '2px 4px',
      borderRadius: '3px',
      fontWeight: '600'
    },
    page: {
      border: '2px solid #fef08a',
      opacity: '.5'
    }
  }
};