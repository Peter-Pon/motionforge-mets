# Migration Guide: intervalTime to duration

## Summary of Changes

This guide documents the changes made to rename the `intervalTime` field to `duration` and add support for an optional `stage` column in CSV files.

### 1. Type Changes

**File: `src/types/index.ts`**
- Changed `intervalTime: number` to `duration: number` in the `ModuleData` interface
- Added optional `stage?: string` field to `ModuleData` interface

### 2. CSV Import Changes  

**File: `src/services/csvImport.ts`**
- Updated `CSVRow` interface to use `duration` instead of `intervalTime`
- Added optional `stage?: string` to `CSVRow` interface
- Updated validation to check for `duration` column instead of `intervalTime`
- Changed error messages to reference "duration" instead of "interval time"
- Added support for importing the optional `stage` field

### 3. CSV Export Changes

**File: `src/services/exportService.ts`**
- Updated CSV export to use `duration` field name
- Added `stage` field to CSV export (if present)
- Updated Excel export column headers from "Interval Time (ms)" to "Duration (ms)"
- Added "Stage" column to Excel export

### 4. UI Changes

**File: `src/components/ParameterTable.tsx`**
- Updated editable fields to include `duration` and `stage` instead of `intervalTime`
- Changed validation for numeric fields to handle `duration`
- Added new "階段" (Stage) column to the parameter table
- Added editing support for the stage field

### 5. Animation/Canvas Changes

**File: `src/components/Canvas/GridCanvas.tsx`**
- Updated all animation timing calculations to use `module.duration` instead of `module.intervalTime`

**File: `src/App.tsx`**
- Updated sample data to use `duration` field
- Updated timeline calculations to use `duration`

### 6. State Management Changes

**File: `src/stores/useProjectStore.ts`**
- Updated module update logic to check for `duration` changes instead of `intervalTime`

### 7. Sample Data Updates

- Updated `sample-data/simple-demo.csv` header from `intervalTime` to `duration`
- Updated `test-data.csv` header from `intervalTime` to `duration`
- Created new example file `sample-data/demo-with-stage.csv` showing usage of the optional `stage` column

## CSV Format Changes

### Old Format:
```csv
module,action,startPosition,moveCount,intervalTime
Module A,Task 1,10,20,100
Module B,Task 2,5,15,150
```

### New Format:
```csv
module,action,startPosition,moveCount,duration
Module A,Task 1,10,20,100
Module B,Task 2,5,15,150
```

### New Format with Stage (optional):
```csv
module,action,startPosition,moveCount,duration,stage
Module A,Task 1,10,20,100,Preparation
Module B,Task 2,5,15,150,Production
```

## Migration Steps for Existing CSV Files

1. Open your CSV file in a text editor or spreadsheet application
2. Change the column header from `intervalTime` to `duration`
3. (Optional) Add a `stage` column after `duration` if you want to categorize your actions
4. Save the file

## Notes

- The `stage` column is optional and does not participate in any calculations
- The `stage` field is displayed in the parameter table and can be edited
- When exporting, the `stage` field will be included if it has a value
- All timing calculations remain the same; only the field name has changed