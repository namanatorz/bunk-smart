# BunkSmart

BunkSmart is an attendance planner that shows your current percentage, how many classes you can miss while staying above your target, and how many consecutive classes you need to attend to recover.

## Project files

- `index.html` contains the website structure.
- `styles.css` contains the responsive design and light/dark themes.
- `app.js` contains the interactive browser calculator and report.
- `bunksmart.c` is the native terminal calculator.

## Browser app

Open `index.html` in a browser. Keep the HTML, CSS, and JavaScript files together in the same folder. Your student details, subjects, and target are saved in that browser's local storage. Use the Student, Calculator, and Graph navigation to enter details, calculate attendance, and print a report.

## C calculator

The native C program contains the same attendance calculations and runs in a terminal. Compile it with a C compiler and the math library:

```sh
gcc -std=c11 -Wall -Wextra -pedantic bunksmart.c -lm -o bunksmart
./bunksmart
```

Enter a target percentage, subject count, and each subject's name, classes held, and classes attended. The program validates inputs and prints per-subject recovery or skip counts plus the overall attendance percentage.

The browser app runs JavaScript because browsers do not execute native C source files. `bunksmart.c` is the matching standalone implementation of the calculator logic.