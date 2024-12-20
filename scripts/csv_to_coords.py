import csv


def main():
    latitudes, longitudes = [], []

    with open("public/apt.csv", "r") as file:
        reader = csv.reader(file)

        for row in reader:
            if len(row) <= 10:
                continue
            latitudes.append(row[9])
            longitudes.append(row[10])

    with open("public/sample_coords.txt", "w") as file:
        for lat, lon in zip(latitudes, longitudes):
            file.write(f"-{lat},{lon}\n")

    print("Successfully wrote to file!")


if __name__ == "__main__":
    main()
