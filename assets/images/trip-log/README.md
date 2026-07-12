# Travel Log photographs

Add optimised WebP or AVIF photographs to the matching day folder after the trip, then reference them in that day’s file under `data/trip-log/`. Day 3 is the working schema example.

To publish a log, add its day file and change only that day’s manifest entry in `data/trip-log-index.js` to `published: true`. Publication flags reduce automatic loading and exposure in normal page inspection; they are not access control. Anything committed to this public repository can still be requested directly.

Images marked `private: true` are not rendered by the website, but anything committed to this public repository is still publicly accessible. 
