#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_SUBJECTS 30
#define NAME_LENGTH 80
#define INPUT_LENGTH 128

typedef struct {
    char name[NAME_LENGTH];
    int held;
    int attended;
} Subject;

typedef struct {
    double percentage;
    int can_recover;
    int classes_to_recover;
    int bunks_available;
} Result;

static int read_line(const char *prompt, char *buffer, size_t size) {
    printf("%s", prompt);
    if (fgets(buffer, (int)size, stdin) == NULL) {
        return 0;
    }
    buffer[strcspn(buffer, "\n")] = '\0';
    return 1;
}

static int parse_double(const char *text, double *value) {
    char *end = NULL;
    while (isspace((unsigned char)*text)) {
        text++;
    }
    if (*text == '\0') {
        return 0;
    }
    *value = strtod(text, &end);
    while (isspace((unsigned char)*end)) {
        end++;
    }
    return end != text && *end == '\0' && isfinite(*value);
}

static int parse_integer(const char *text, int *value) {
    double parsed;
    if (!parse_double(text, &parsed) || parsed < 0 || parsed > 2147483647 || floor(parsed) != parsed) {
        return 0;
    }
    *value = (int)parsed;
    return 1;
}

static int read_number(const char *prompt, double minimum, double maximum, double *value) {
    char input[INPUT_LENGTH];
    for (;;) {
        if (!read_line(prompt, input, sizeof(input))) {
            return 0;
        }
        if (parse_double(input, value) && *value >= minimum && *value <= maximum) {
            return 1;
        }
        printf("Enter a number from %.1f to %.1f.\n", minimum, maximum);
    }
}

static int read_count(const char *prompt, int minimum, int maximum, int *value) {
    char input[INPUT_LENGTH];
    for (;;) {
        if (!read_line(prompt, input, sizeof(input))) {
            return 0;
        }
        if (parse_integer(input, value) && *value >= minimum && *value <= maximum) {
            return 1;
        }
        printf("Enter a whole number from %d to %d.\n", minimum, maximum);
    }
}

static Result analyse(const Subject *subject, double target) {
    Result result = {0};
    result.percentage = subject->attended * 100.0 / subject->held;
    result.can_recover = 1;

    if (result.percentage >= target) {
        double spare = subject->attended * 100.0 / target - subject->held;
        result.bunks_available = (int)fmax(0.0, floor(spare + 1e-9));
    } else if (target == 100.0) {
        result.can_recover = 0;
    } else {
        double required = (target * subject->held - 100.0 * subject->attended) / (100.0 - target);
        result.classes_to_recover = (int)fmax(0.0, ceil(required - 1e-9));
    }
    return result;
}

int main(void) {
    Subject subjects[MAX_SUBJECTS];
    double target;
    double total_held = 0;
    double total_attended = 0;
    int subject_count;

    printf("BunkSmart attendance calculator\n");
    printf("-------------------------------\n");
    if (!read_number("Required attendance (1-100%): ", 1.0, 100.0, &target) ||
        !read_count("Number of subjects (1-30): ", 1, MAX_SUBJECTS, &subject_count)) {
        fprintf(stderr, "Input ended before the calculator could finish.\n");
        return 1;
    }

    for (int i = 0; i < subject_count; i++) {
        char prompt[INPUT_LENGTH];
        int valid_name = 0;
        printf("\nSubject %d\n", i + 1);
        while (!valid_name) {
            if (!read_line("Name: ", subjects[i].name, sizeof(subjects[i].name))) {
                fprintf(stderr, "Input ended while reading a subject name.\n");
                return 1;
            }
            valid_name = subjects[i].name[0] != '\0';
            if (!valid_name) {
                printf("Enter a subject name.\n");
            }
        }
        snprintf(prompt, sizeof(prompt), "Classes held: ");
        if (!read_count(prompt, 1, 2147483647, &subjects[i].held)) {
            fprintf(stderr, "Input ended while reading classes held.\n");
            return 1;
        }
        snprintf(prompt, sizeof(prompt), "Classes attended (0-%d): ", subjects[i].held);
        if (!read_count(prompt, 0, subjects[i].held, &subjects[i].attended)) {
            fprintf(stderr, "Input ended while reading classes attended.\n");
            return 1;
        }
        total_held += subjects[i].held;
        total_attended += subjects[i].attended;
    }

    printf("\nAttendance report\n");
    printf("Target: %.2f%%\n", target);
    printf("-----------------------------------------------\n");
    for (int i = 0; i < subject_count; i++) {
        Result result = analyse(&subjects[i], target);
        printf("%s: %.1f%% (%d/%d) - ", subjects[i].name, result.percentage,
               subjects[i].attended, subjects[i].held);
        if (result.percentage >= target) {
            printf("%d class%s available to skip\n", result.bunks_available,
                   result.bunks_available == 1 ? "" : "es");
        } else if (result.can_recover) {
            printf("attend the next %d class%s to recover\n", result.classes_to_recover,
                   result.classes_to_recover == 1 ? "" : "es");
        } else {
            printf("a 100%% target cannot be recovered after a missed class\n");
        }
    }
    printf("-----------------------------------------------\n");
    printf("Overall: %.1f%% (%d/%d classes), target %.2f%%\n",
           total_attended * 100.0 / total_held, (int)total_attended,
           (int)total_held, target);
    return 0;
}