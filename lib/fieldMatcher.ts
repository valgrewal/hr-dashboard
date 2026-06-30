// Fuzzy field name matching for Chinese/English HR column headers

type FieldCategory = 'name' | 'department' | 'position' | 'level' | 'hireDate' | 'leaveDate'
  | 'birthDate' | 'gender' | 'education' | 'tenure' | 'salary' | 'performance'
  | 'status' | 'manager' | 'location' | 'age' | 'type';

interface MatchedField {
  key: string;
  category: FieldCategory;
  confidence: number; // 0-1
}

const PATTERNS: Record<FieldCategory, RegExp[]> = {
  name: [/姓名$/, /^姓名/, /员工名称/, /名字/, /^name$/i, /employee.*name/i],
  department: [/部门$/, /^部门/, /组织/, /^dept/i, /department/i, /所属部门/],
  position: [/岗位$/, /职位/, /职务/, /^position$/i, /^job$/i, /title/i],
  level: [/职级/, /级别/, /等级/, /^level$/i, /grade/i, /^band$/i, /^P\d/, /^M\d/],
  hireDate: [/入职/, /到岗/, /入职日期/, /^hire/i, /join.*date/i, /entry.*date/i],
  leaveDate: [/离职/, /离开/, /最后工作日/, /^leave/i, /termination/i, /resign/i],
  birthDate: [/出生/, /生日/, /^birth/i, /dob/i, /出生日期/],
  gender: [/性别/, /^sex$/i, /^gender$/i, /男女/],
  education: [/学历/, /学位/, /教育/, /^edu/i, /degree/i],
  tenure: [/司龄/, /工龄/, /年限/, /^tenure$/i, /years.*service/i, /service.*year/i],
  salary: [/薪资/, /薪酬/, /工资/, /年薪/, /月薪/, /^salary$/i, /compensation/i, /^pay$/i],
  performance: [/绩效/, /考核/, /评分/, /^perf/i, /rating/i, /KPI/i, /OKR/i],
  status: [/状态/, /在职/, /^status$/i, /active/i, /是否在职/],
  manager: [/上级/, /汇报/, /经理/, /主管/, /^manager$/i, /report/i, /leader/i],
  location: [/地点/, /城市/, /办公/, /^location$/i, /city/i, /office/i, /base/i],
  age: [/年龄/, /^age$/i, /年纪/],
  type: [/类型/, /用工/, /合同/, /^type$/i, /category/i, /全职.*兼职/, /正式.*外包/],
};

export function matchFields(headers: string[]): MatchedField[] {
  return headers.map((header) => {
    let best: MatchedField = { key: header, category: 'department', confidence: 0 };

    for (const [category, patterns] of Object.entries(PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(header)) {
          const confidence = pattern.source.length > 3 ? 0.9 : 0.7;
          if (confidence > best.confidence) {
            best = { key: header, category: category as FieldCategory, confidence };
          }
          break;
        }
      }
    }

    return best;
  });
}

export { type FieldCategory, type MatchedField };
