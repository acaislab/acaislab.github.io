import { Midi } from '@tonejs/midi';
const midi = new Midi();
const track = midi.addTrack();
midi.header.setTempo(60);
track.addNote({
  midi: 60,
  ticks: 0,
  durationTicks: 480
});
console.log(track.notes[0].time, track.notes[0].duration);
