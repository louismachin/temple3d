```
One object per line. Lines starting with # are ignored.
x, z = centre on the floor, y = base height. Units are metres.

title   Any Text
floor                  w d          colour
box     name  x y z    w h d        colour
pillar  name  x y z    w h          colour      (octagonal, w = width)
pyramid name  x y z    w h d        colour
steps   name  x y z    w h d        colour  n   (n steps, rising to -z)

Colours: #rgb, #rrggbb, or a name (red, gold, navy...)
  black/white       checkered, 1m squares
  black/white/0.5   checkered, 0.5m squares
  white|black       alternating colours per step
```
