using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SpeedyUnicode
{
    public class UnicodeCharacter
    {
        public string Unicode
        {
            get
            {
                return ToString();
            }
            private set { }
        }

        public string Name { get; set; }
        public string Number { get; set; }

        public override string ToString()
        {
            int uniInt = int.Parse(this.Number, System.Globalization.NumberStyles.HexNumber);
            return char.ConvertFromUtf32(uniInt);
        }
    }
}
