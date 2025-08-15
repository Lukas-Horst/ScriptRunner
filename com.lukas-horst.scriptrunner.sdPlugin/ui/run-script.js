setTimeout(() => {
    setId();

    scheduleCheck();
    let schedule = document.getElementById('schedule');
    schedule.addEventListener('input', () => {
        setTimeout(() => {
            scheduleCheck();
        }, 10);
    });


    imagesCheck()
    let trueImage = document.getElementById('trueImage');
    trueImage.addEventListener('input', () => {
        setTimeout(() => {
            imagesCheck();
        }, 10);
    });
    let falseImage = document.getElementById('falseImage');
    falseImage.addEventListener('input', () => {
        setTimeout(() => {
            imagesCheck();
        }, 10);
    });

    separateScheduleCheck();
    let separateScheduleCheckbox = document.getElementById('separateScheduleCheckbox');
    separateScheduleCheckbox.addEventListener('input', () => {
        setTimeout(() => {
            separateScheduleCheck();
        }, 10);
    })

    scriptCheck()
    let file = document.getElementById('file');
    file.addEventListener('input', () => {
        setTimeout(() => {
            scriptCheck();
        }, 10);
    });

    separateScriptCheck();
    let separateScriptCheckbox = document.getElementById('separateScriptCheckbox');
    separateScriptCheckbox.addEventListener('input', () => {
        setTimeout(() => {
            separateScriptCheck();
        }, 10);
    });
}, 10);

function setId() {
    let actionId = document.getElementById('actionId');
    if (!actionId.value) {
        actionId.value = getCurrentDate();
    }
}

function scriptCheck() {
    let file = document.getElementById('file');
    let terminalCheckbox = document.getElementById('terminalCheckbox');
    let parametersItem = document.getElementById('parametersItem');
    let trueImage = document.getElementById('trueImage');
    let falseImage = document.getElementById('falseImage');
    let separateScriptCheckbox = document.getElementById('separateScriptCheckbox');
    let imagesItem1 = document.getElementById('imagesItem1');
    let imagesItem2 = document.getElementById('imagesItem2');
    let scheduleItem = document.getElementById('scheduleItem');
    let schedule = document.getElementById('schedule');
    let parameters = document.getElementById('parameters');
    let actionId = document.getElementById('actionId');
    let autostartCheckbox = document.getElementById('autostartCheckbox');
    let countdownCheckbox = document.getElementById('countdownCheckbox');
    let separateFileItem = document.getElementById('separateFileItem');
    let separateFile = document.getElementById('separateFile');
    let separateParametersItem = document.getElementById('separateParametersItem');
    let separateParameters = document.getElementById('separateParameters');
    let separateScheduleCheckbox = document.getElementById('separateScheduleCheckbox');
    let separateScheduleItem = document.getElementById('separateScheduleItem');
    let separateSchedule = document.getElementById('separateSchedule');

    let fileValue = file.value;
    if (fileValue) {
        if (fileValue.endsWith('.py') || fileValue.endsWith('.ps1')) {
            terminalCheckbox.style.display = 'block';
            parametersItem.style.display = 'block';
            trueImage.style.display = 'block';
            falseImage.style.display = 'block';
            imagesItem1.style.display = 'block';
            imagesItem2.style.display = 'block';
            scheduleItem.style.display = 'block';
            setId();
        }
        return;
    }
    terminalCheckbox.style.display = 'none';
    terminalCheckbox.value = false;
    parametersItem.style.display = 'none';
    parameters.value = '';
    trueImage.style.display = 'none';
    trueImage.value = '';
    falseImage.style.display = 'none';
    falseImage.value = '';
    separateScriptCheckbox.style.display = 'none';
    separateScriptCheckbox.value = false;
    imagesItem1.style.display = 'none';
    imagesItem2.style.display = 'none';
    scheduleItem.style.display = 'none';
    schedule.value = '';
    actionId.value = '';
    autostartCheckbox.style.display = 'none';
    autostartCheckbox.value = false;
    countdownCheckbox.style.display = 'none';
    countdownCheckbox.value = false;
    separateFileItem.style.display = 'none';
    separateFile.value = '';
    separateParametersItem.style.display = 'none';
    separateParameters.value = '';
    separateScheduleCheckbox.value = false;
    separateScheduleItem.style.display = 'none';
    separateSchedule.value = '';
}

function scheduleCheck() {
    let schedule = document.getElementById('schedule');
    let autostartCheckbox = document.getElementById('autostartCheckbox');
    let countdownCheckbox = document.getElementById('countdownCheckbox');

    let scheduleValue = schedule.value;
    // Convert the value to a number
    const scheduleNumber = parseInt(scheduleValue, 10);
    // Check if the value is a number AND if it's greater than 0
    if (!isNaN(scheduleNumber) && scheduleNumber > 0) {
        autostartCheckbox.style.display = 'block';
        countdownCheckbox.style.display = 'block';
    } else {
        autostartCheckbox.style.display = 'none';
        autostartCheckbox.value = false;
        countdownCheckbox.style.display = 'none';
        countdownCheckbox.value = false;
    }
}

function imagesCheck() {
    let trueImage = document.getElementById('trueImage');
    let falseImage = document.getElementById('falseImage');
    let separateScriptCheckbox = document.getElementById('separateScriptCheckbox');

    let trueImageValue = trueImage.value;
    let falseImageValue = falseImage.value;

    if (trueImageValue || falseImageValue) {
        separateScriptCheckbox.style.display = 'block';
    } else {
        separateScriptCheckbox.style.display = 'none';
        separateScriptCheckbox.value = false;
    }
}

function separateScriptCheck() {
    let separateScriptCheckbox = document.getElementById('separateScriptCheckbox');

    let separateFileItem = document.getElementById('separateFileItem');
    let separateFile = document.getElementById('separateFile');
    let separateParametersItem = document.getElementById('separateParametersItem');
    let separateParameters = document.getElementById('separateParameters');
    let separateScheduleCheckbox = document.getElementById('separateScheduleCheckbox');

    let separateScriptCheckboxValue = separateScriptCheckbox.value;
    if (separateScriptCheckboxValue) {
        separateFileItem.style.display = 'block';
        separateParametersItem.style.display = 'block';
    } else {
        separateFileItem.style.display = 'none';
        separateFile.value = '';
        separateParametersItem.style.display = 'none';
        separateParameters.value = '';
        separateScheduleCheckbox.value = false;
    }
}

function separateScheduleCheck() {
    let scheduleItem = document.getElementById('scheduleItem');
    let schedule = document.getElementById('schedule');
    let separateScheduleCheckbox = document.getElementById('separateScheduleCheckbox');
    let separateScheduleItem = document.getElementById('separateScheduleItem');
    let separateSchedule = document.getElementById('separateSchedule');

    if (separateScheduleCheckbox.value) {
        schedule.value = '';
        scheduleCheck();
        scheduleItem.style.display = 'none';
        separateScheduleItem.style.display = 'block';
    } else {
        scheduleItem.style.display = 'block';
        separateScheduleItem.style.display = 'none';
        separateSchedule.value = '';
    }
}

function clearFile(elementName) {
    let element = document.getElementById(elementName);
    element.value = "";
    scriptCheck();
    imagesCheck()
}

function getCurrentDate() {
    // Get current date and time
    const now = new Date();

    // Get the date components and pad with a leading zero if needed
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = now.getFullYear();

    // Get the time components and pad with a leading zero if needed
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // Format the date and time string
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}