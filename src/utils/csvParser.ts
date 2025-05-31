// src/utils/csvParser.ts

import Papa from 'papaparse';
import type { Student } from '../types/Student'; // Student 型をインポート
import { CSV_DELIMITERS } from '../constants'; // 区切り文字候補をインポート

// CSV/TSVパース結果の各行のオブジェクト型（ヘッダーをキーとする）
// papaparse の dynamicTyping で型が自動変換される可能性もあるが、ここでは string として扱う前提
interface RawCsvRow {
  [header: string]: any; // ヘッダー名をキーとする任意の型の値
}

/**
 * CSVまたはタブ区切りテキストをパースし、Student[] 型の配列に変換します。
 * ヘッダーの名称に関わらず、列の出現順に Student 型のプロパティにマッピングを行います。
 * 最初の列から順番に number, name, kana, info1, info2, info3 に割り当てます。
 *
 * @param text CSVまたはタブ区切りのテキストデータ。
 * @param delimitersToGuess 区切り文字の候補配列（例: [',', '\t']）。
 * @returns Student[] 型の配列。パースまたは変換できない無効な行はスキップされます。
 * @throws Error パース処理中に致命的なエラーが発生した場合。
 */
export const parseStudentData = (text: string, delimitersToGuess: string[] = CSV_DELIMITERS): Student[] => {
  let parsedResult: Papa.ParseResult<RawCsvRow>;

  try {
    // papaparse でテキストデータをパース
    parsedResult = Papa.parse<RawCsvRow>(text, {
      header: true, // 最初の行をヘッダーとして使用し、データ行をオブジェクトとしてパース（ただし、このヘッダー名はマッピングには使用しない）
      dynamicTyping: false, // 自動型変換はオフにする（全て文字列として扱う）
      skipEmptyLines: true, // 空行をスキップ
      delimiter: "", // 空文字を指定すると delimitersToGuess から自動検出
      delimitersToGuess: delimitersToGuess, // 推測する区切り文字の候補
    });
  } catch (error) {
    console.error('CSV parse catch error:', error);
    throw new Error(`CSVパース中に予期せぬエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (parsedResult.errors.length > 0) {
     console.warn('Papa.parse detected format errors:', parsedResult.errors);
  }

  // パース結果のデータ配列 (parsedResult.data) を Student 型の配列に変換
  const students: Student[] = parsedResult.data
    .map((row, index) => {
      // row は { ヘッダー名: 値, ... } のオブジェクトですが、
      // ここではヘッダー名に依存せず、値の配列として扱います。
      // parsedResult.meta.fields にヘッダー名が順番に格納されているため、それを利用して値を取得します。
      const rowValues = parsedResult.meta.fields ? parsedResult.meta.fields.map(field => row[field]) : Object.values(row);

      // 各プロパティに左から順番に値を割り当てます
      // 値は String() で明示的に文字列に変換し、trim() で前後の空白を除去します。
      const number = String(rowValues[0] || '').trim();
      const name = String(rowValues[1] || '').trim();
      const kana = String(rowValues[2] || '').trim();
      const info1 = String(rowValues[3] || '').trim();
      const info2 = String(rowValues[4] || '').trim();
      const info3 = String(rowValues[5] || '').trim();

      // 必須項目（例: 氏名）が欠けている場合は null を返して後でフィルタリングします。
      if (!name) {
         console.warn(`行 ${index + 2}: 生徒名（2列目）が見つかりません。この行はスキップされます。`, row); // ヘッダー行があるので +2
         return null; // 無効な行として null を返す
      }

      // ID は、データにID列があってもそうでなくても、一意な値を自動生成します。
      // CSVからのIDを使用する要件がないため、ここでは常に自動生成します。
      const id = `student-${Date.now()}-${index}`;

      const student: Student = {
        id: id,
        number: number || String(index + 1), // 1列目が空の場合は行番号を使用
        name: name,
        kana: kana,
        info1: info1,
        info2: info2,
        info3: info3,
        isAssigned: false, // 初期状態では割り当てられていない
        assignedSeatId: null, // 初期状態では座席は割り当てられていない
      };

      return student; // 有効な Student オブジェクトを返す

    })
    .filter((student): student is Student => student !== null); // null をフィルタリングして Student[] 型にする

  if (students.length === 0 && parsedResult.data.length > 0) {
       console.warn('Parsed data contains rows, but no valid students (e.g., missing name in the second column) were extracted.');
  }

  return students; // 変換後の Student 配列を返す
};