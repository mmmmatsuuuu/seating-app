// src/components/output/PrintableSeatChart.tsx
import React from 'react';
import type { Student } from '../../types/Student';
import type { SeatMapData } from '../../types/Seat';

// 生徒出力フィールドのインターフェースを定義
interface StudentOutputFields {
  id: boolean;
  number: boolean;
  name: boolean;
  kana: boolean;
  info1: boolean;
  info2: boolean;
  info3: boolean;
}

// PrintableSeatChartコンポーネントのプロパティを定義
interface PrintableSeatChartProps {
  seatMap: SeatMapData[]; // 座席マップデータ
  students: Student[];     // 生徒データ
  selectedFields: StudentOutputFields; // 表示する生徒情報の選択状態
}

/**
 * 印刷・PDF出力用の座席表コンポーネント。
 * SeatMapChartとは異なり、選択された生徒情報を各座席に表示します。
 */
const PrintableSeatChart: React.FC<PrintableSeatChartProps> = ({
  seatMap,
  students,
  selectedFields,
}) => {
  // 座席マップの最大行と最大列を計算
  const maxRow = Math.max(...seatMap.map((seat) => seat.row));
  const maxCol = Math.max(...seatMap.map((seat) => seat.col));

  // CSS Gridのテンプレート列を動的に生成
  // 各列の幅を自動調整し、最小100pxを確保
  const gridTemplateColumns = `repeat(${maxCol}, minmax(100px, 1fr))`;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplateColumns, // 動的に設定された列
        gap: '10px', // 座席間のスペース
        border: '1px solid #ccc', // 全体の枠線
        padding: '10px', // 内側の余白
        backgroundColor: '#f9f9f9', // 背景色
        overflowX: 'auto', // 横スクロールが必要な場合
      }}
    >
      {/* 最大行と最大列に基づいてグリッドセルを生成 */}
      {Array.from({ length: maxRow * maxCol }).map((_, index) => {
        const r = Math.floor(index / maxCol) + 1; // 現在の行番号
        const c = (index % maxCol) + 1; // 現在の列番号

        // 現在のセルに対応する座席情報を検索 (isUsableな座席のみ)
        const seat = seatMap.find((s) => s.row === r && s.col === c && s.isUsable);
        // 座席に割り当てられた生徒情報を検索
        const student = seat && seat.assignedStudentId
          ? students.find((s) => s.id === seat.assignedStudentId)
          : null;

        return (
          <div
            key={`${r}-${c}`} // 一意のキー
            style={{
              border: '1px solid #ddd', // 座席の枠線
              borderRadius: '8px', // 角丸
              padding: '10px', // 座席内の余白
              aspectRatio: '16/11',
              minHeight: '80px', // 最小高さ
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: seat ? '#fff' : '#eee', // 使用可能座席は白、使用不可座席は灰色
              boxShadow: seat ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', // 影
              textAlign: 'center', // テキスト中央揃え
              fontSize: '0.9em', // フォントサイズ
              color: '#333', // テキスト色
            }}
          >
            {seat ? ( // 座席が使用可能な場合
              <>
                {student ? ( // 生徒が割り当てられている場合
                  <div style={{ fontSize: '0.85em' }}>
                    {/* 選択されたフィールドに基づいて生徒情報を表示 */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
                      }}
                    >
                      {selectedFields.number && student.number ? <div>{`${student.number}: `}</div>: <div></div>}
                      {selectedFields.name && student.name ? <div style={{ fontSize: 16, fontWeight: 'bold' }}>{`${student.name}`}</div>: <div>-</div>}
                    </div>
                    {selectedFields.kana && student.kana ? <div>{`${student.kana}`}</div>: <div>-</div>}
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'end', alignItems: 'start', gap: '4px', color: '#666' }}>
                      {selectedFields.info1 && student.info1 && <div>{`${student.info1}`}</div>}
                      {selectedFields.info2 && student.info2 && <div>{`${student.info2}`}</div>}
                      {selectedFields.info3 && student.info3 && <div>{`${student.info3}`}</div>}
                    </div>
                    {selectedFields.id && student.id && <div>{`生徒ID: ${student.id}`}</div>}
                  </div>
                ) : ( // 生徒が割り当てられていない場合
                  <div style={{ color: '#888' }}>空席</div>
                )}
              </>
            ) : ( // 座席が使用不可の場合
              <div style={{ color: '#aaa' }}>使用不可</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PrintableSeatChart;