using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SpeedyUnicode
{
    public partial class frmSplashMessage : Form
    {
        public frmSplashMessage(string message)
        {
            InitializeComponent();
            this.BackColor = Color.LimeGreen;
            this.TransparencyKey = Color.LimeGreen;
            lblMessage.Text = message;
        }
    }
}
