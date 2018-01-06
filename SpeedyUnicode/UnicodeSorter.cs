using System.Collections;

namespace SpeedyUnicode
{
    public class UnicodeSorter : IComparer
    {
        public int Compare(object a, object b)
        {
            var charA = a as UnicodeCharacter;
            var charB = b as UnicodeCharacter;

            // if dates equal, fallback to filter accuracy
            if (charA.LastSelected == charB.LastSelected)
            {
                return charA.FilterAccuracy < charB.FilterAccuracy ? 0 : 1;
            }

            return charA.LastSelected > charB.LastSelected ? 0 : 1;
        }
    }
}
