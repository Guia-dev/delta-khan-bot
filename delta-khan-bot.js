// ==UserScript==
// @name         Khan Academy Bot
// @version      1
// @description  ur welcome cheater
// @author       Alexander Guia
// @match        https://www.khanacademy.org/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    window.loaded = false;

    class Answer {
        constructor(answer, type) {
            this.body = answer;
            this.type = type;
        }

        get isMultiChoice() {
            return this.type == "multiple_choice";
        }

        get isFreeResponse() {
            return this.type == "free_response";
        }

        get isExpression() {
            return this.type == "expression";
        }

        get isDropdown() {
            return this.type == "dropdown";
        }

        log() {
            const answer = this.body;
            const style = "color: #5F9EA0; -webkit-text-stroke: .5px black; font-size:24px; font-weight:bold;";

            answer.forEach((ans, index) => {
                if (typeof ans === "string") {
                    if (ans.includes("web+graphie")) {
                        // Handle image-based answers
                        this.body[index] = ""; // Clear the string, since we're printing an image instead
                        this.printImage(ans);
                    } else {
                        answer[index] = ans.replaceAll("$", ""); // Handle LaTeX-like symbols in answers
                    }
                }
            });

            const text = answer.filter(a => a !== "").join("\n");
            if (text) {
                console.log(`%c${text.trim()} `, style); // Log textual answers
            }
        }

        printImage(ans) {
    // Construct the URL
            const url = ans.replace("web+graphie://", "https://").replace(/\)$/, "");
            const finalUrl = url + '.svg';

            console.log(`Image URL: ${finalUrl}`); // Log the URL for debugging
            const image = new Image();
            image.src = finalUrl;

            image.onload = () => {
                // Adjust this based on the actual size of the image if needed
                const imageStyle = [
                    'font-size: 1px;',
                    'line-height: ', image.height, 'px;',
                    'padding: ', image.height * 0.5, 'px ', image.width * 0.5, 'px;',
                    'background-size: ', image.width, 'px ', image.height, 'px;',
                    'background: url(', finalUrl, ');'
                ].join(' ');

                console.log('%c ', imageStyle); // Log the image into the console
            };

            image.onerror = () => {
                console.error('%c[Error loading image]', 'color: red; font-size: 18px; font-weight: bold;');
                // Debug the URL to check accessibility
                fetch(url)
                   .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok: ' + response.statusText);
                    }
                    return response.blob();
                })
                    .then(blob => {
                    // Handle successful image load
                })
                    .catch(error => {
                    console.error('Error fetching image:', error);
                });
            };
        }
    }

    const originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then(async (res) => {
            if (res.url.includes("/getAssessmentItem")) {
                const clone = res.clone();
                const json = await clone.json()

let item, question;

                    try {
                        item = json.data.assessmentItem.item.itemData;
                        question = JSON.parse(item).question;
                    } catch {
                        let errorIteration = () => { return localStorage.getItem("error_iter") || 0; }
                        localStorage.setItem("error_iter", errorIteration() + 1);

                        if (errorIteration() < 4) {
                            return location.reload();
                        } else {
                            return console.log("%c An error occurred", "color: red; font-weight: bolder; font-size: 20px;");
                        }
                    }

                    if (!question) return;

                    Object.keys(question.widgets).map(widgetName => {
                        switch (widgetName.split(" ")[0]) {
                            case "numeric-input":
                                return freeResponseAnswerFrom(question).log();
                            case "input-number":
                                return freeResponseAnswerFrom(question).log();
                            case "radio":
                                return multipleChoiceAnswerFrom(question).log();
                            case "expression":
                                return expressionAnswerFrom(question).log();
                            case "dropdown":
                                return dropdownAnswerFrom(question).log();
                        }
                    });
            }

            if (!window.loaded) {
                console.clear();
                console.log("%c Delta Khan Bot ", "color: hsl(219, 100%, 34%); -webkit-text-stroke: .5px black; font-size:40px; font-weight:bolder; padding: .2rem;");
                console.log("%cCreated by Alex Guia (@guiaworks)", "color: white; -webkit-text-stroke: .5px black; font-size:15px; font-weight:bold;");
                window.loaded = true;
            }

            return res;
        })
    }

    function freeResponseAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.answers) {
                return widget.options.answers.map(answer => {
                    if (answer.status == "correct") {
                        return answer.value;
                    }
                });
            } else if (widget.options?.inexact == false) {
                return widget.options.value;
            }
        }).flat().filter((val) => { return val !== undefined; });

        return new Answer(answer, "free_response");
    }

    function multipleChoiceAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.choices) {
                return widget.options.choices.map(choice => {
                    if (choice.correct) {
                        return choice.content;
                    }
                });
            }
        }).flat().filter((val) => { return val !== undefined; });

        return new Answer(answer, "multiple_choice");
    }

    function expressionAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.answerForms) {
                return widget.options.answerForms.map(answer => {
                    if (Object.values(answer).includes("correct")) {
                        return answer.value;
                    }
                });
            }
        }).flat();

        return new Answer(answer, "expression");
    }

    function dropdownAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.choices) {
                return widget.options.choices.map(choice => {
                    if (choice.correct) {
                        return choice.content;
                    }
                });
            }
        }).flat();

        return new Answer(answer, "dropdown");
    }
})();
