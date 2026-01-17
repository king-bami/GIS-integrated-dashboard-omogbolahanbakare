# Learning Log

While building this project, the most challenging part was working with spatial data in a way that was both accurate and efficient. My initial instinct was to calculate distance using basic latitude and longitude math, but I quickly noticed that the results were not always reliable, especially when comparing multiple ambulance locations.

To understand this better, I researched how geospatial databases handle real world distance calculations. This led me to PostGIS and the use of geometry and geography data types. I learned that casting coordinates to geography allows the database to calculate distance based on the Earth’s curvature rather than a flat plane. After updating my schema and queries to use PostGIS spatial functions, the proximity results became much more accurate.

Another challenge I encountered was performance. Running spatial queries repeatedly for the same hospital could become expensive as the system scales. To solve this, I implemented a caching layer that stores the nearest ambulance result per hospital. This significantly reduced database load. I also added cache invalidation logic so that when an ambulance location is updated, outdated proximity results are cleared to keep the data consistent.

On the frontend, connecting backend spatial logic to a map visualization helped validate the correctness of my implementation. Seeing the hospital, ambulance, and connecting line on the map made it easier to confirm that the nearest ambulance logic was working as expected.

This project deepened my understanding of geospatial systems, spatial indexing, and performance conscious backend design. It also reinforced the importance of choosing the right data structures and database tools when working with location based systems.
 