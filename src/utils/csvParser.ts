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
 * CSVのヘッダー行を基に、Student 型のプロパティにマッピングを行います。
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
      header: true, // 最初の行をヘッダーとして使用し、データ行をオブジェクトとしてパース
      dynamicTyping: false, // 自動型変換はオフにする（全て文字列として扱う）
      skipEmptyLines: true, // 空行をスキップ
      delimiter: "", // 空文字を指定すると delimitersToGuess から自動検出
      delimitersToGuess: delimitersToGuess, // 推測する区切り文字の候補
      // worker: true, // 大規模データの場合はワーカーを使うとパフォーマンスが向上するが、小規模なら不要
      // error: (error) => { console.error('Papa.parse stream error:', error); } // ストリームモードでのエラーハンドリング
    });
  } catch (error) {
    // Papa.parse の同期処理中に発生した予期せぬエラーを捕捉
    console.error('CSV parse catch error:', error);
    throw new Error(`CSVパース中に予期せぬエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Papa.parse が検出したエラー（形式の不一致など）をチェック
  if (parsedResult.errors.length > 0) {
     console.warn('Papa.parse detected format errors:', parsedResult.errors);
     // ここでエラーをどのように扱うか決定（エラーメッセージとして表示、特定の行を無視など）
     // 今回は警告ログを出しつつ、可能な行だけ処理に進みます
     // より厳密にするなら、throw new Error('CSVデータにパースエラーがあります。'); とする
  }

  // パース結果のデータ配列 (parsedResult.data) を Student 型の配列に変換
  const students: Student[] = parsedResult.data
    .map((row, index) => {
      // row は { ヘッダー名: 値, ... } のオブジェクト
      // Student 型のプロパティにマッピングします。
      // CSVのヘッダー名が異なる可能性があるため、複数の候補名を試すとロバスト性が増します。
      // 値は String() で明示的に文字列に変換しておくと安全です。undefined や null も文字列 "undefined", "null" になりますが、これは後の処理でトリムするなど対応します。

      // 必須項目（例: 氏名）が欠けている場合は null を返して後でフィルタリングします。
      const name = String(row['氏名'] || row['名前'] || '').trim(); // '氏名' または '名前' ヘッダーを試す

      if (!name) {
         // 必須項目が見つからない行はスキップ
         console.warn(`行 ${index + 2}: 生徒名が見つかりません ('氏名' または '名前' 列)。この行はスキップされます。`, row); // ヘッダー行があるので +2
         return null; // 無効な行として null を返す
      }

      // ID はCSVにID列があればそれを使用、なければユニークなIDを自動生成します。
      const id = String(row['ID'] || row['id'] || `student-${Date.now()}-${index}`); // 'ID' または 'id' 列を試す

      const student: Student = {
        id: id,
        number: String(row['出席番号'] || row['番号'] || row['No'] || index + 1).trim(), // '番号' または 'No'
        name: name,
        kana: String(row['ふりがな'] || row['カナ'] || '').trim(), // 'ふりがな' または 'カナ'
        info1: String(row['追加情報1'] || row['性別'] || '').trim(), // '追加情報1' または '性別'
        info2: String(row['追加情報2'] || row['出身学校'] || row['出身'] || '').trim(), // '追加情報2' または '出身学校' または '出身'
        info3: String(row['追加情報3'] || row['備考'] || '').trim(), // '追加情報3' または '備考'
        isAssigned: false, // 初期状態では割り当てられていない
        assignedSeatId: null, // 初期状態では座席は割り当てられていない
      };

      return student; // 有効な Student オブジェクトを返す

    })
    .filter((student): student is Student => student !== null); // null をフィルタリングして Student[] 型にする

  // データ行はあったが、有効な生徒が1件も見つからなかった場合のチェック
  if (students.length === 0 && parsedResult.data.length > 0) {
       console.warn('Parsed data contains rows, but no valid students (e.g., missing name) were extracted.');
       // 必要であればここで特定のエラーメッセージを設定したり、ログに詳細を出すなどの処理を追加
  }


  return students; // 変換後の Student 配列を返す
};