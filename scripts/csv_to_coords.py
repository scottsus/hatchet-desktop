import csv
from math import cos, sin
# def main():
#     latitudes, longitudes = [], []

#     with open("public/apt4.1.csv", "r") as file:
#         reader = csv.reader(file)

#         for row in reader:
#             if len(row) <= 10:
#                 continue
#             latitudes.append(row[9])
#             longitudes.append(row[10])

#     with open("public/sample_coords4.1.txt", "w") as file:
#         for lat, lon in zip(latitudes, longitudes):
#             file.write(f"-{lat},{lon}\n")

#     print("Successfully wrote to file!")

def main():
    print("test")
    # Initialize lists for each column
    temperature, pressure, altitude = [], [], []
    day, month, year, hour, minute, second = [], [], [], [], [], [],
    latitude, longitude, operator_id = [], [], []
    message_counter, step_counter, flags = [], [], []
    pos_est_inertial_mag_x, pos_est_inertial_mag_y = [], []
    pos_est_inertial_x, pos_est_inertial_y, pos_est_inertial_z = [], [], []
    alt_est_pressometer, lat_est_gps, lon_est_gps = [], [], []
    gps_est_quality, north_align_angle_inertial_path = [], []
    yaw_drift_inertial_path, crc_ccitt, thesia_string = [], [], []

    # Read the CSV file again to populate the lists
    with open("public/apt2.csv", "r") as file:
        reader = csv.reader(file)
        count_started = False
        header_skipped = False

        for row in reader:
            if not header_skipped:
                header_skipped = True
                continue

            if len(row) > 12 and not count_started and row[12].isdigit() and int(row[12]) > 0:
                count_started = True
                count_started = True

            if count_started and len(row) > 27:
                temperature.append(row[0])
                pressure.append(row[1])
                altitude.append(row[2])
                day.append(row[3])
                month.append(row[4])
                year.append(row[5])
                hour.append(row[6])
                minute.append(row[7])
                second.append(row[8])
                latitude.append(row[9])
                longitude.append(row[10])
                operator_id.append(row[11])
                message_counter.append(row[12])
                step_counter.append(row[13])
                flags.append(row[14])
                pos_est_inertial_mag_x.append(row[15])
                pos_est_inertial_mag_y.append(row[16])
                pos_est_inertial_x.append(row[17])
                pos_est_inertial_y.append(row[18])
                pos_est_inertial_z.append(row[19])
                alt_est_pressometer.append(row[20])
                lat_est_gps.append(row[21])
                lon_est_gps.append(row[22])
                gps_est_quality.append(row[23])
                north_align_angle_inertial_path.append(row[24])
                yaw_drift_inertial_path.append(row[25])
                crc_ccitt.append(row[26])
                thesia_string.append(row[27])

    
    # Convert the first latitude and longitude to float
    if not latitude or not longitude:
        print("Error: Latitude or Longitude data is missing.")
        return

    initial_lat = float(latitude[0])
    initial_lon = float(longitude[0])

    # Function to convert displacement in meters to degrees
    def meters_to_degrees(meters, at_latitude):
        earth_radius = 6378137  # Radius of the Earth in meters
        degrees_per_meter = 1 / (earth_radius * (3.141592653589793 / 180))
        return meters * degrees_per_meter / cos(at_latitude * (3.141592653589793 / 180))

    with open("public/sample_coords2thesia.txt", "w") as file:
        for dx, dy in zip(pos_est_inertial_x, pos_est_inertial_y):
            # Flip the delta
            dx = -1 * float(dx)
            dy = float(dy)
            # Rotate the delta 50 degrees clockwise
            rotated_dx = float(dx) * cos(3.141592653589793 * 50 / 180) + float(dy) * sin(3.141592653589793 * 50 / 180)
            rotated_dy = -float(dx) * sin(3.141592653589793 * 50 / 180) + float(dy) * cos(3.141592653589793 * 50 / 180)
            # Shrink the delta slightly
            rotated_dx = float(rotated_dx) * 0.95
            rotated_dy = float(rotated_dy) * 0.85
            # Convert displacement to degrees
            delta_lat = meters_to_degrees(float(rotated_dy), initial_lat)
            delta_lon = meters_to_degrees(float(rotated_dx), initial_lat)
            
            # Calculate new coordinates
            new_lat = initial_lat + delta_lat
            new_lon = initial_lon + delta_lon
            
            file.write(f"-{new_lat},{new_lon}\n")

    print("Successfully populated all lists!")

if __name__ == "__main__":
    main()
