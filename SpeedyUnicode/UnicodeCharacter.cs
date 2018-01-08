using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SpeedyUnicode
{
    public class UnicodeCharacter: IComparable<UnicodeCharacter>
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
        public DateTime LastSelected { get; set; }
        public int FilterAccuracy { get; set; }

        public override string ToString()
        {
            int uniInt = int.Parse(this.Number, System.Globalization.NumberStyles.HexNumber);
            return char.ConvertFromUtf32(uniInt);
        }

        public int CompareTo(UnicodeCharacter other)
        {
            // if dates equal, fallback to filter accuracy
            if (this.LastSelected == other.LastSelected)
            {
                return this.FilterAccuracy < other.FilterAccuracy ? 0 : 1;
            }

            return this.LastSelected > other.LastSelected ? 0 : 1;
        }
    }
}
