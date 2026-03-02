// ═══════════════════════════════════════════════════════════
// QURAN TRACKER — Google Apps Script Backend
// ═══════════════════════════════════════════════════════════
// This script turns your Google Sheet into a free database API.
// Deploy as a Web App and paste the URL into your PWA.
// ═══════════════════════════════════════════════════════════

// ── CORS + Response Helpers ──
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET Handler (Load Data) ──
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get readings from "Readings" sheet
    var readingsSheet = ss.getSheetByName("Readings");
    var settingsSheet = ss.getSheetByName("Settings");
    
    var readings = {};
    if (readingsSheet && readingsSheet.getLastRow() > 1) {
      var readingsData = readingsSheet.getRange(2, 1, readingsSheet.getLastRow() - 1, 4).getValues();
      readingsData.forEach(function(row) {
        if (row[0]) {
          readings[row[0]] = {
            rating: row[1] || null,
            logs: row[2] ? row[2].split(",").filter(function(s) { return s.trim(); }) : [],
            lastRead: row[3] || null
          };
        }
      });
    }
    
    // Get settings
    var dailyGoal = 5;
    var streak = { current: 0, best: 0, lastDate: null };
    
    if (settingsSheet && settingsSheet.getLastRow() >= 2) {
      var settingsData = settingsSheet.getRange(2, 1, 1, 5).getValues()[0];
      dailyGoal = settingsData[0] || 5;
      streak = {
        current: settingsData[1] || 0,
        best: settingsData[2] || 0,
        lastDate: settingsData[3] || null
      };
    }
    
    return createJsonResponse({
      success: true,
      data: {
        readings: readings,
        dailyGoal: dailyGoal,
        streak: streak
      }
    });
    
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

// ── POST Handler (Save Data) ──
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ── Save Readings ──
    var readingsSheet = ss.getSheetByName("Readings");
    if (!readingsSheet) {
      readingsSheet = ss.insertSheet("Readings");
      readingsSheet.appendRow(["Key", "Rating", "Logs", "LastRead"]);
    }
    
    // Clear existing data (keep header)
    if (readingsSheet.getLastRow() > 1) {
      readingsSheet.getRange(2, 1, readingsSheet.getLastRow() - 1, 4).clearContent();
    }
    
    // Write all readings
    var readings = payload.readings || {};
    var keys = Object.keys(readings);
    if (keys.length > 0) {
      var rows = keys.map(function(key) {
        var r = readings[key];
        return [
          key,
          r.rating || "",
          (r.logs || []).join(","),
          r.lastRead || ""
        ];
      });
      readingsSheet.getRange(2, 1, rows.length, 4).setValues(rows);
    }
    
    // ── Save Settings ──
    var settingsSheet = ss.getSheetByName("Settings");
    if (!settingsSheet) {
      settingsSheet = ss.insertSheet("Settings");
      settingsSheet.appendRow(["DailyGoal", "StreakCurrent", "StreakBest", "StreakLastDate", "LastSynced"]);
    }
    
    var streak = payload.streak || { current: 0, best: 0, lastDate: null };
    var now = new Date().toISOString();
    
    if (settingsSheet.getLastRow() < 2) {
      settingsSheet.appendRow([payload.dailyGoal || 5, streak.current, streak.best, streak.lastDate || "", now]);
    } else {
      settingsSheet.getRange(2, 1, 1, 5).setValues([
        [payload.dailyGoal || 5, streak.current, streak.best, streak.lastDate || "", now]
      ]);
    }
    
    return createJsonResponse({ success: true, synced: now });
    
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

// ── Setup Function (Run Once) ──
// Run this function once to create the initial sheet structure
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create Readings sheet
  var readingsSheet = ss.getSheetByName("Readings");
  if (!readingsSheet) {
    readingsSheet = ss.insertSheet("Readings");
  }
  readingsSheet.clear();
  readingsSheet.appendRow(["Key", "Rating", "Logs", "LastRead"]);
  readingsSheet.setFrozenRows(1);
  readingsSheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#166534").setFontColor("white");
  readingsSheet.setColumnWidth(1, 150);
  readingsSheet.setColumnWidth(2, 100);
  readingsSheet.setColumnWidth(3, 400);
  readingsSheet.setColumnWidth(4, 120);
  
  // Create Settings sheet
  var settingsSheet = ss.getSheetByName("Settings");
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet("Settings");
  }
  settingsSheet.clear();
  settingsSheet.appendRow(["DailyGoal", "StreakCurrent", "StreakBest", "StreakLastDate", "LastSynced"]);
  settingsSheet.appendRow([5, 0, 0, "", ""]);
  settingsSheet.setFrozenRows(1);
  settingsSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#166534").setFontColor("white");
  
  // Rename default Sheet1 if it exists
  var sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1) {
    ss.deleteSheet(sheet1);
  }
  
  SpreadsheetApp.getUi().alert("✅ Setup complete! Your Quran Tracker database is ready.");
}
