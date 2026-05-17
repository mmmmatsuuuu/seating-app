import React from 'react';
import type { Student } from '../../types/Student';
import type { SeatMapData } from '../../types/Seat';

interface StudentOutputFields {
  id: boolean;
  number: boolean;
  name: boolean;
  kana: boolean;
  info1: boolean;
  info2: boolean;
  info3: boolean;
}

interface PrintableSeatChartProps {
  seatMap: SeatMapData[];
  students: Student[];
  selectedFields: StudentOutputFields;
}

const PrintableSeatChart: React.FC<PrintableSeatChartProps> = ({
  seatMap,
  students,
  selectedFields,
}) => {
  const maxRow = Math.max(...seatMap.map((seat) => seat.row));
  const maxCol = Math.max(...seatMap.map((seat) => seat.col));

  return (
    <div className="print-chart-root" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ border: '1px solid #555', color: '#333', textAlign: 'center', padding: '4px 0', marginBottom: '6px', fontSize: '0.85em', fontWeight: 'bold' }}>
        黒板（前）
      </div>

      {/* CSS変数 --seat-cols で列数を @media print の CSS に伝達する */}
      <div
        className="print-seat-grid"
        style={{
          '--seat-cols': maxCol,
          display: 'grid',
          gridTemplateColumns: `repeat(${maxCol}, minmax(80px, 1fr))`,
          gap: '6px',
          padding: '4px',
          flex: 1,
        } as React.CSSProperties}
      >
        {Array.from({ length: maxRow * maxCol }).map((_, index) => {
          const r = Math.floor(index / maxCol) + 1;
          const c = (index % maxCol) + 1;

          const seat = seatMap.find((s) => s.row === r && s.col === c && s.isUsable);
          const student = seat?.assignedStudentId
            ? students.find((s) => s.id === seat.assignedStudentId)
            : null;

          return (
            <div
              key={`${r}-${c}`}
              className="print-seat-cell"
              style={{
                border: seat ? '1px solid #000' : '1px solid #bbb',
                borderRadius: 0,
                padding: '6px',
                aspectRatio: '16/11',
                minHeight: '60px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#fff',
                textAlign: 'center',
                fontSize: '0.9em',
                color: '#333',
              }}
            >
              {seat ? (
                <>
                  {student ? (
                    <div style={{ fontSize: '0.85em' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        {selectedFields.number && student.number && <div>{`${student.number}:`}</div>}
                        {selectedFields.name && student.name
                          ? <div style={{ fontSize: 15, fontWeight: 'bold' }}>{student.name}</div>
                          : <div>-</div>
                        }
                      </div>
                      {selectedFields.kana && student.kana && <div>{student.kana}</div>}
                      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: '4px', color: '#555' }}>
                        {selectedFields.info1 && student.info1 && <div>{student.info1}</div>}
                        {selectedFields.info2 && student.info2 && <div>{student.info2}</div>}
                        {selectedFields.info3 && student.info3 && <div>{student.info3}</div>}
                      </div>
                      {selectedFields.id && student.id && <div style={{ fontSize: '0.75em', color: '#666' }}>{`ID: ${student.id}`}</div>}
                    </div>
                  ) : (
                    <div style={{ color: '#999' }}>空席</div>
                  )}
                </>
              ) : (
                <div style={{ color: '#ccc' }}>-</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '0.8em', color: '#666' }}>
        後
      </div>
    </div>
  );
};

export default PrintableSeatChart;
