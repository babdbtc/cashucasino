# Sweet Bonanza Sound Setup Guide

This guide will help you download and set up royalty-free sounds for the Sweet Bonanza slot game.

## Directory Structure

All sounds should be placed in the `/public/sounds/` directory with the following structure:

```
public/sounds/
├── spin.mp3           # Reel spinning sound
├── symbol-land.mp3    # Symbol landing/pop sound
├── win-small.mp3      # Small win celebration
├── win-medium.mp3     # Medium win celebration
├── win-big.mp3        # Big win celebration
├── tumble.mp3         # Cascade/tumble effect
├── scatter.mp3        # Scatter (lollipop) sound
├── freespins.mp3      # Free spins trigger
├── button-click.mp3   # UI button click
└── bg-music.mp3       # Background music (optional)
```

## Where to Download Sounds

### 1. Spin Sound
- **Source**: Mixkit - https://mixkit.co/free-sound-effects/slot-machine/
- **Recommended**: "Slot machine wheel spin" or "Casino slot machine wheel"
- **Save as**: `spin.mp3`

### 2. Symbol Landing Sound
- **Source**: Pixabay - https://pixabay.com/sound-effects/search/pop/
- **Recommended**: Search for "pop" or "bubble pop" - choose a short, sweet pop sound
- **Save as**: `symbol-land.mp3`

### 3. Win Sounds (Small, Medium, Big)
- **Source**: Mixkit - https://mixkit.co/free-sound-effects/casino/
- **Recommended**:
  - Small: "Casino win notification" (shorter, lighter)
  - Medium: "Casino bonus achievement"
  - Big: "Casino jackpot" or "Big win celebration"
- **Save as**: `win-small.mp3`, `win-medium.mp3`, `win-big.mp3`

### 4. Tumble/Cascade Sound
- **Source**: Pixabay - https://pixabay.com/sound-effects/search/whoosh/
- **Recommended**: Search for "whoosh" or "swoosh" - choose something quick and satisfying
- **Save as**: `tumble.mp3`

### 5. Scatter (Lollipop) Sound
- **Source**: Pixabay - https://pixabay.com/sound-effects/search/candy/
- **Recommended**: Search for "candy" or "magic sparkle" - something special/magical
- **Save as**: `scatter.mp3`

### 6. Free Spins Trigger
- **Source**: Uppbeat - https://uppbeat.io/sfx/category/winner/casino-winner
- **Recommended**: "Casino winner celebration" or any big fanfare sound
- **Alternative**: Mixkit casino celebration sounds
- **Save as**: `freespins.mp3`

### 7. Button Click
- **Source**: Pixabay - https://pixabay.com/sound-effects/search/click/
- **Recommended**: Search for "button click" or "ui click" - short and crisp
- **Save as**: `button-click.mp3`

### 8. Background Music (Optional)
- **Source**: Pixabay - https://pixabay.com/music/search/casino/
- **Recommended**: Search for "casino upbeat" or "playful casino" - choose a loopable track
- **Save as**: `bg-music.mp3`

## Download Instructions

1. Visit each source link above
2. Search for the recommended keywords
3. Preview sounds and pick ones that match the Sweet Bonanza theme (candy, sweet, fun)
4. Download the sounds (usually MP3 format)
5. Rename them according to the filenames listed above
6. Place all files in the `public/sounds/` directory

## Tips

- **Keep files small**: Try to keep each sound effect under 500KB for faster loading
- **Use MP3 format**: Most compatible across browsers
- **Volume normalization**: Try to keep sounds at similar volume levels
- **Preview before downloading**: Make sure the sounds match the sweet/candy theme

## Attribution (if required)

Some sources like Pixabay don't require attribution, but it's good practice to keep track:

- Mixkit: No attribution required for free sounds
- Pixabay: No attribution required
- Uppbeat: Check license terms (may require attribution)

## Testing

Once you've downloaded and placed the sounds:
1. Start the development server
2. Navigate to Sweet Bonanza
3. Enable sound using the 🔊 button
4. Test by spinning and winning

## License Notes

All sounds recommended here are from royalty-free sources that allow commercial use. However, always verify the license terms on the source website before using in production.
