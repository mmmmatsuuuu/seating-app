import Papa from 'papaparse';
import type { Student } from '../types/Student';
import { CSV_DELIMITERS } from '../constants';

// header: false で全行をデータ行として扱う。先頭行を読み飛ばす header: true はバグの原因になるため使わない。
export const parseStudentData = (text: string, delimitersToGuess: string[] = CSV_DELIMITERS): Student[] => {
  let parsedResult: Papa.ParseResult<string[]>;

  try {
    parsedResult = Papa.parse<string[]>(text, {
      header: false,
      dynamicTyping: false,
      skipEmptyLines: true,
      delimiter: '',
      delimitersToGuess: delimitersToGuess,
    });
  } catch (error) {
    throw new Error(`CSVパース中に予期せぬエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (parsedResult.errors.length > 0) {
    console.warn('Papa.parse detected format errors:', parsedResult.errors);
  }

  const students: Student[] = parsedResult.data
    .map((row: string[], index: number) => {
      const number = String(row[0] || '').trim();
      const name = String(row[1] || '').trim();
      const kana = String(row[2] || '').trim();
      const info1 = String(row[3] || '').trim();
      const info2 = String(row[4] || '').trim();
      const info3 = String(row[5] || '').trim();

      if (!name) {
        console.warn(`行 ${index + 1}: 2列目（氏名）が空のためスキップします。`);
        return null;
      }

      return {
        id: `student-${Date.now()}-${index}`,
        number: number || String(index + 1),
        name,
        kana,
        info1,
        info2,
        info3,
        isAssigned: false,
        assignedSeatId: null,
      } as Student;
    })
    .filter((student: Student | null): student is Student => student !== null);

  return students;
};